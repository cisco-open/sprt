#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/"

if [ -f "${DIR}parameters_dev.sh" ]; then
    source "${DIR}parameters_dev.sh"
else 
    source "${DIR}parameters.sh"
fi

usage() {
    echo "\
Usage: control.sh [OPTIONS] COMMAND [ARGS]...

        Options:
          -h             Show this message and exit.

        Commands:
          start          Start server
          stop [gui|udp] Stop server or specific process
          status         Check if processes are running
          reload         Graceful workers restart
          config         Configure server
          upgrade        Check and upgrade server
          check          Check prerequisites

        Start arguments:
          -p <port>        Port number where to listen, 8080 by default. GUI only
          -a <address>     Address of interface where to listen. GUI only
          -d <all|gui|udp> Start process in debug mode
          -w <number>      Amount of workers, 32 by default. GUI only
          -o <gui|udp>     Start only GUI or only UDP

        Upgrade arguments:
          -s <file>      Upgrade from file (if specified)

        Examples:
          control.sh start -p 8080 -a 127.0.0.1
          control.sh start -p 80 
"
}

OK() {
    GREEN='\033[0;32m'
    NC='\033[0m' # No Color
    printf " - ${GREEN}OK${NC}\n"
}

NOK() {
    RED='\033[0;31m'
    NC='\033[0m' # No Color
    printf " - ${RED}NOT OK${NC}\n"
}

WARN() {
    YELLOW='\033[0;33m'
    NC='\033[0m' # No Color
    printf "${YELLOW}${1}${NC}"
}

reload() {
    if [[ "$1" = 'hard' ]]; then
        stop
        sleep 2s
        start
        return
    fi

    if [ ! -f ${PID_FILE} ]; then
        echo "GUI is not running."
    else
        echo "Reloading GUI..."
        kill -HUP `cat ${PID_FILE}`
    fi

    if [ -f ${DHOST_PID} ]; then
        echo "Reloading DHost..."
        kill -HUP `cat ${DHOST_PID}`
    else
        echo "DHost is not running."
    fi

    if [ -f ${UDP_SERVER_PID_FILE} ]; then
        echo "Reloading UDP Server..."
        kill -HUP `cat ${UDP_SERVER_PID_FILE}`
    else
        echo "UDP Server is not running."
    fi
}

stop () {
    WHAT='all'
    if [ "$1" = "gui" ]; then
        WHAT='gui'
    elif [ "$1" = "udp" ]; then
        WHAT='udp'
    elif [ "$1" = "dhost" ]; then
        WHAT='dhost'
    fi

    if [ "$WHAT" = 'all' -o "$WHAT" = 'gui' ]; then
        if [ ! -f ${PID_FILE} ]; then
            echo "Frontend is NOT running, nothing to stop"
        else
            echo "Stopping frontend..."
            kill -TERM `cat ${PID_FILE}`
        fi
    fi

    if [ "$WHAT" = 'all' -o "$WHAT" = 'dhost' ]; then
        if [ ! -f ${DHOST_PID} ]; then
            echo "DHost is NOT running, nothing to stop"
        else
            echo "Stopping DHost..."
            kill -INT `cat ${DHOST_PID}`
        fi
    fi

    if [ "$WHAT" = 'all' -o "$WHAT" = 'udp' ]; then
        if [ ! -f ${UDP_SERVER_PID_FILE} ]; then
            echo "UDP server is NOT running, nothing to stop"
        else
            echo "Stopping UDP server..."
            kill -INT `cat ${UDP_SERVER_PID_FILE}`
        fi
    fi
}

check_if_started() {
    F=''
    if [ "$1" = "gui" ]; then
        F=$PID_FILE
    elif [ "$1" = "udp" ]; then
        F=$UDP_SERVER_PID_FILE
    elif [ "$1" = "dhost" ]; then
        F=$DHOST_PID
    else
        return 0
    fi

    echo "Waiting for the process to start..."
    ATTEMPTS=0
    while [ $ATTEMPTS -le 15 ]; do
        sleep 1s
        if [ -e $F ]; then
            PID=`cat $F`
            ST=$(kill -0 `cat $F`)
            if [ -n "${PID}" -a -d "/proc/${PID}" ]; then
                printf "Process started with PID $PID"
                OK
                return 1
            fi
        fi
        ((ATTEMPTS++))
    done
    printf "Process failed to start"
    NOK
    return 0
}

start() {
    # Process package options
    ADDRESS=""
    WHAT='all'
    while getopts ":d:p:w:a:o:" opt; do
        case $opt in
            d)
                DEBUG=$OPTARG
                if [ "$DEBUG" != 'all' -a "$DEBUG" != 'gui' -a "$DEBUG" != 'udp' -a "$DEBUG" != 'dhost' ]; then
                    echo "Invalid debug option: $DEBUG" 1>&2
                    exit 1
                fi
                ;;
            w)
                WORKERS=$OPTARG
                ;;
            p)
                PORT=$OPTARG
                ;;
            a)
                ADDRESS=$OPTARG
                ;;
            o)
                WHAT=$OPTARG
                if [ "$WHAT" != 'gui' -a "$WHAT" != 'udp' -a "$WHAT" != 'dhost' ]; then
                    echo "Invalid option: $WHAT" 1>&2
                    exit 1
                fi
                ;;
            *)
                echo "Invalid Option: -$OPTARG" 1>&2
                exit 1
                ;;
        esac
    done
    shift $((OPTIND-1))

    if [ "$WHAT" = 'all' -o "$WHAT" = 'gui' ]; then
        if [ ! "$ADDRESS" ] || [ -z "$ADDRESS" ]; then ADDRESS="$PORT"
        else ADDRESS="${ADDRESS}:${PORT}"
        fi

        echo "Starting GUI frontend: $WORKERS workers on port ${PORT}..."
        COMMAND=(start_server --port ${ADDRESS} --pid-file=$PID_FILE --status-file=$STATUS_FILE --signal-on-hup=QUIT -- starman --workers $WORKERS -MDancer2 -MLog::Log4perl "${DIR}app.psgi")
        if [ $DEBUG = 'all' -o $DEBUG = 'gui' ]; then
            WARN "Debugs are enabled for GUI, writing to gui_out.log"
            printf "\n"
            nohup ${COMMAND[@]} > gui_out.log 2>&1&
        else
            nohup ${COMMAND[@]} > /dev/null 2>&1&
        fi
        check_if_started "gui"
    fi

    if [ "$WHAT" = 'all' -o "$WHAT" = 'dhost' ]; then
        echo "Starting Daemons Host..."
        COMMAND=(${DIR}generator_host --pid_file=${DHOST_PID} --log_file=${DHOST_STATUS})
        if [ $DEBUG = 'all' -o $DEBUG = 'dhost' ]; then
            WARN "Debugs are enabled for dhost, writing to dhost_out.log"
            printf "\n"
            nohup ${COMMAND[@]} > dhost_out.log 2>&1&
        else
            nohup ${COMMAND[@]} > /dev/null 2>&1&
        fi
        check_if_started "dhost"
    fi

    if [ "$WHAT" = 'all' -o "$WHAT" = 'udp' ]; then
        echo "Starting UDP server..."
        COMMAND=(${DIR}udp_server --pid_file=${UDP_SERVER_PID_FILE} --log_file=${UDP_SERVER_LOG_FILE})
        if [ $DEBUG = 'all' -o $DEBUG = 'udp' ]; then
            WARN "Debugs are enabled for UDP, writing to udp_out.log"
            printf "\n"
            nohup ${COMMAND[@]} > udp_out.log 2>&1&
        else
            nohup ${COMMAND[@]} > /dev/null 2>&1&
        fi
        check_if_started "udp"
    fi
}

debug() {
    WARN "Debugging ${1}"
    printf "\n"
    if [ -z "$1" -a "${1+xxx}" = "xxx" ]; then
        echo "Component must be specified."
        exit 1
    fi

    if [ "$1" = 'gui' ]; then
        if [ -f ${PID_FILE} ] && ps -p `cat ${PID_FILE}` > /dev/null ; then
            stop 'gui'
        fi
        > gui_out.log
        start -o gui -d gui | tail -f gui_out.log
    fi

    if [ "$1" = 'dhost' ]; then
        if [ -f ${DHOST_PID} ] && ps -p `cat ${DHOST_PID}` > /dev/null ; then
            stop 'dhost'
        fi
        > dhost_out.log
        start -o dhost -d dhost | tail -f dhost_out.log
    fi

    if [ "$1" = 'udp' ]; then
        if [ -f ${UDP_SERVER_PID_FILE} ] && ps -p `cat ${UDP_SERVER_PID_FILE}` > /dev/null ; then
            stop 'udp'
        fi
        > udp_out.log
        start -o udp -d udp | tail -f udp_out.log
    fi
}

status() {
    if [ -f ${PID_FILE} ] && ps -p `cat ${PID_FILE}` > /dev/null ; then
        PID=`cat ${PID_FILE}`
        printf "Frontend:\trunning, PID: ${PID}\n"
    else
        printf "Frontend:\tNOT running\n"
    fi

    if [ -f ${DHOST_PID} ] && ps -p `cat ${DHOST_PID}` > /dev/null ; then
        PID=`cat ${DHOST_PID}`
        printf "DHost:\t\trunning, PID: ${PID}\n"
    else
        printf "DHost:\t\tNOT running\n"
    fi

    if [ -f ${UDP_SERVER_PID_FILE} ] && ps -p `cat ${UDP_SERVER_PID_FILE}` > /dev/null ; then
        PID=`cat ${UDP_SERVER_PID_FILE}`
        printf "UDP server:\trunning, PID: ${PID}\n"
    else
        printf "UDP server:\tNOT running\n"
    fi
}

haveProg() {
    [ -x "$(which $1)" ]
}

try_apt_get() {
    if haveProg apt-get ; then
        mod=${1,,}
        mod="lib${mod//::/-}-perl"
        apt-get -y install $mod
        if [ $? == 0 ]; then 
            OK
            return 1
        else 
            NOK
            return 0
        fi
    else return 0
    fi
}

check_modules() {
    echo "Checking modules"
    DEPS="${DIR}../lib/dependencies.json"
    total=$(jq -r '.modules|length' ${DEPS})
    counter=0
    APPLIED=0
    INSTALL=0
    SUDO=0
    for module in $(jq -r '.modules[]' ${DEPS}); do
        res=$(perl -le 'eval "require $ARGV[0]" and print 1 and exit; print 2' ${module})
        # echo $module $res
        if [ $res == 2 ]; then
            echo -ne '\n'
            if [ $APPLIED == 0 ]; then
                printf "%s not installed, install %s? (y/n) " "$module" "$module"
                read answer
                if [ $answer == 'y' ] || [ $answer == 'yes' ]; then
                    INSTALL=1
                    
                    printf "Install with --sudo? (y/n) "
                    read answer
                    if [ $answer == 'y' ] || [ $answer == 'yes' ]; then SUDO=1
                    else SUDO=0
                    fi

                    printf "Apply to all not installed modules? (y/n) "
                    read answer
                    if [ $answer == 'y' ] || [ $answer == 'yes' ]; then APPLIED=1
                    else APPLIED=0
                    fi
                else
                    printf "%s is required, exiting\n" "$module"
                    exit 1
                fi
            fi

            if [ $INSTALL == 1 ]; then
                try_apt_get "$module"
                if [ $? == 0 ]; then
                    if [ $SUDO == 1 ]; then eval cpanm --sudo --interactive $module
                    else eval cpanm --interactive $module
                    fi
                fi
            fi
            ret_code=$?
            if [ $ret_code != 0 ]; then
                printf "Error during module '%s' installation.\nTry to install manually and re-start config\n" $module
                exit $ret_code
            fi
        fi
        ((counter++))
        prc=$(( ($counter*100)/$total ))
        hashes=$(( ($prc*30)/100 ))
        spaces=$(( 30-$hashes ))
        out=''
        for ((i=1; i<=$hashes; i++)); do out="${out}#"; done
        for ((i=1; i<=$spaces; i++)); do out="${out} "; done
        out=$(printf "[%s (%s%%)]" "$out" "$prc")
        echo -ne "${out}\r" 
    done
    echo -ne '\n'
}

check_jq() {
    printf "Checking jq"
    O=1
    command -v jq >/dev/null 2>&1 || {
        O=0
        NOK
        echo >&2 "I require jq but it's not installed.";
        printf "Try to install? (y/n) "
        read answer
        if [ $answer == 'y' ] || [ $answer == 'yes' ]; then
            if haveProg apt-get ; then eval sudo apt-get install jq
            elif haveProg yum ; then eval sudo yum install jq
            elif haveProg zypper ; then eval sudo zypper install jq
            elif haveProg brew ; then eval brew install jq
            else
                echo 'No package manager found!'
                exit 2
            fi
        else
            printf "jq is required, exiting\n"
            exit 1
        fi
    }
    if [ ${O} == 1 ]; then
        OK
    fi
}

check_cpanm() {
    printf "Checking cpanm"
    O=1
    command -v cpanm >/dev/null 2>&1 || { 
        O=0
        NOK
        echo >&2 "I require cpanm but it's not installed.";
        printf "Try to install? (y/n) "
        read answer
        if [ $answer == 'y' ] || [ $answer == 'yes' ]; then
            curl -L https://cpanmin.us | perl - --sudo App::cpanminus
        else
            printf "cpanm is required, exiting\n" "$module"
            exit 1
        fi
    }
    if [ ${O} == 1 ]; then
        OK
    fi
}

check_psql() {
    printf "Checking PostgreSQL"
    O=1
    command -v psql >/dev/null 2>&1 || { 
        O=0
        NOK
        echo >&2 "I require PostgreSQL but it's not installed. Please install";
        printf "Continue anyway (if located on different host)? (y/n) "
        read answer
        if [ $answer != 'y' ] && [ $answer != 'yes' ]; then
            printf "psql is required, exiting\n" "$module"
            exit 1
        fi
    }
    if [ ${O} == 1 ]; then
        OK
    fi
}

check_perl() {
    printf "Checking Perl"
    O=1
    command -v perl >/dev/null 2>&1 || { 
        O=0
        NOK
        echo >&2 "I require Perl but it's not installed.";
        printf "Try to install? (y/n) "
        read answer
        if [ $answer == 'y' ] || [ $answer == 'yes' ]; then
            if haveProg apt-get ; then eval sudo apt-get install perl
            elif haveProg yum ; then eval sudo yum install perl
            elif haveProg zypper ; then eval sudo zypper install perl
            elif haveProg brew ; then eval brew install perl
            else
                echo 'No package manager found!'
                exit 2
            fi
        else
            printf "Perl is required, exiting\n"
            exit 1
        fi
    }
    vers=$(perl -e 'print $] ge "5.016000" ? "OK" : "$^V";')
    if [ $vers == 'NOK' ]; then
        O=0
        NOK
        printf "Current Perl version is ${vers} which is less than minimum required - 5.16.0"
        exit 1
    fi
    if [ ${O} == 1 ]; then
        vers=$(perl -e 'print "$^V";')
        printf " version ${vers} found"
        OK
    fi
}

check_post_upgrade() {
    check_modules

    if [ ! -f "${DIR}post_upgrade.pl" ]; then
        return 1
    fi

    perl "${DIR}post_upgrade.pl"

    rm -f "${DIR}post_upgrade.pl"
}

config() {
    check_perl
    check_psql
    check_cpanm
    check_jq
    check_modules

    perl "${DIR}configurator.pl"
}

manual_upgrade() {
    echo "Upgrading from $1"
    sudo tar -xz --strip-components 1 -C "${DIR}../" -f "$1"
    return 1
}

auto_upgrade() {
    return 0
}

upgrade() {
    UPG_FROM=""
    while getopts ":s:" opt; do
        case $opt in
            s)
                UPG_FROM=$OPTARG
                ;;
            *)
                echo "Invalid Option: -$OPTARG" 1>&2
                exit 1
                ;;
        esac
    done
    shift $((OPTIND-1))

    if [ "$UPG_FROM" ] && [ ! -z "$UPG_FROM" ]; then 
        if [ -f "$UPG_FROM" ]; then
            manual_upgrade "$UPG_FROM"
        else
            echo "File $UPG_FROM doesn't exist."
            exit 1
        fi
    else
        auto_upgrade
    fi

    if [ $? == 1 ]; then
        check_post_upgrade
        reload
    fi
}

while getopts ":h" opt; do
    case ${opt} in
        h )
            usage
            exit 0
            ;;
        \? )
            echo "Invalid Option: -$OPTARG" 1>&2
            exit 1
            ;;
    esac
done
shift $((OPTIND -1))

subcommand=$1; shift
case "$subcommand" in
    start)
        start $@
        ;;
    stop)
        stop $@
        ;;
    debug)
        debug $@
        ;;
    status)
        status
        ;;
    reload)
        reload $@
        ;;
    config)
        config
        ;;
    upgrade)
        upgrade $@
        ;;
    check)
        check_modules
        ;;
    *)
        usage
        ;;
esac