import React from 'react';
import PropTypes from 'prop-types';

class Progressbar extends React.Component {
    getClassName() {
        const { size, color, className } = this.props;

        return 'progressbar' + 
            (size !== 'default' ? ` progressbar--${size}` : '') + 
            (color ? ` progressbar--${color}` : '') +
            (className ? ` ${className}` : '');
    }

    renderLabel() {
        const { label } = this.props;
        if ( !label ) { return null; }

        return <div className="progressbar__label">{label}</div>;
    }

    render () {
        const { baloon, color, percentage, innerRef } = this.props;

        let newProps = {
            'data-percentage': percentage,
            ref: innerRef,
            className: this.getClassName()
        };

        if ( baloon ) {
            newProps['data-balloon-visible'] = true;
            newProps['data-balloon'] = baloon; 
            newProps['data-balloon-pos'] = "up";
            if (color) {
                newProps[`data-balloon-${color}`] = true;
            }
        }

        return (
            <div {...newProps} >
                <div className="progressbar__fill"></div>
                { this.renderLabel() }
            </div>
        );
    }
}

Progressbar.propTypes = {
    size: PropTypes.oneOf(['small', 'default', 'large']),
    percentage: PropTypes.number.isRequired,
    color: PropTypes.oneOf([false, 'success', 'indigo', 'warning']),
    baloon: PropTypes.string,
    label: PropTypes.string,
}

Progressbar.defaultProps = {
    size: 'default',
    color: false,
}

const refProgressbar = React.forwardRef((props, ref) => <Progressbar innerRef={ref} {...props} />);
export { refProgressbar as Progressbar };