#!/bin/bash

export PROG="sprt"
export PID_FILE="/var/run/${PROG}.pid"
export STATUS_FILE="/var/log/${PROG}.status"
 
export UDP_SERVER="sprt_coa_server"
export UDP_SERVER_PID_FILE="/var/run/${UDP_SERVER}.pid"
export UDP_SERVER_LOG_FILE="/tmp/${UDP_SERVER}.log"
 
export DHOST="sprt_dhost"
export DHOST_PID="/var/run/${DHOST}.pid"
export DHOST_STATUS="/var/log/${DHOST}.status"

PORT=8080
DEBUG=0
export WORKERS=5
