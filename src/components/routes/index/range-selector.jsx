import React, { Component, PropTypes } from 'react';
import applyStyles from 'react-css-modules';
import styles from './range-selector.less';
import { autobind } from 'core-decorators';
import d3 from 'd3';

function constrain(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Range selector
 * (React + D3)
 *
 * @param {array} range [left boundary value, right boundary value]
 * @param {function} onChange returns array [left selected value, right selected value]
 * @param {number} [width=800]
 * @param {number} [height=60]
 *
 * See propTypes for size fine tuning
 * See RenderSVGGradients() for skin
 */
export default
@applyStyles(styles)
class RangeSelector extends Component {
    static propTypes = {
        range: PropTypes.arrayOf(PropTypes.number).isRequired,
        width: PropTypes.number,
        height: PropTypes.number,
        onChange: PropTypes.func.isRequired,

        // typically omit these to use defaults
        handleWidth: PropTypes.number,
        padLeft: PropTypes.number,
        padRight: PropTypes.number,
        round: PropTypes.number,
        trackHeight: PropTypes.number,
    }

    static defaultProps = {
        handleWidth: 40,
        height: 55,
        tickHeight: 25,
        padLeft: 40,
        padRight: 40,
        round: 0,
        trackHeight: 25,
        width: 800,
        valueProp: 'value'
    }

    rc = 4; // SVG rounded corners
    barY = 2;
    bar = null;
    currentValueA = 0; // pixels
    currentValueB = 0; // pixels
    handleA = null;
    handleB = null;
    track = null;
    handleTextA = null;
    handleTextB = null;


    componentDidMount() {
        this.currentValueA = 0;
        this.currentValueB = this.size.trackWidth;
        this.setupD3();
        this.updatePositions(this.currentValueA, this.currentValueB);
    }


    componentWillUpdate() {
        this._size = null;
        this._handleSize = null;
        this._scale = null;
    }


    // Dragging is handled by D3 and does not trigger a React update, but new data
    // or a resize will trigger an update and redraw at the new size
    componentDidUpdate() {
        this.setupD3();
        this.updatePositions(this.currentValueA, this.currentValueB);
    }


    _scale = null;
    get scale() {
        if (!this._scale) {
            // converts pixels to range values
            this._scale = d3.scale.linear()
                .domain([0, this.size.trackWidth])
                .rangeRound(this.props.range);
        }
        return this._scale;
    }


    _size = null;
    get size() {
        if (!this._size) {
            this._size = {
                barHeight: this.props.trackHeight - this.barY,
                barY: this.barY,
                handleHeight: this.props.height - this.props.trackHeight,
                trackY: this.props.height - this.props.trackHeight,
                trackWidth: this.props.width - this.props.padLeft - this.props.padRight,
            };
        }
        return this._size;
    }


    _handleSize = null;
    get handleSize() {
        if (!this._handleSize) {
            const arrowHeight = 10;
            const arrowWidth = 20;
            const handleHeight = this.props.height - this.props.trackHeight;
            const boxHeight = handleHeight - arrowHeight;

            this._handleSize = {
                arrowHeight,
                arrowMid: arrowWidth / 2,
                boxHeight,
                handleHeight,
                mid: this.props.handleWidth / 2,
                textY: (boxHeight / 2) + 5,
                width: this.props.handleWidth
            };
        }
        return this._handleSize;
    }


    round(n) {
        return Math.round(n, this.round);
    }


    /**
     * Find handle DOM objects
     * define D3 drag behavior
     * set up drag x values
     */
    setupD3() {
        const self = this;

        const drag = d3.behavior.drag()
            .origin(d => d)
            .on('drag', d => {
                const delta = d3.event.sourceEvent.movementX;
                dragHandler(d.type, delta);
            });

        this.track = d3.selectAll('.track');
        this.bar = d3.selectAll('.bar')
            .data([{ x: 0, y: 0, type: 'bar' }]);

        this.handleA = d3.selectAll('.handle.handle-a')
            .data([{ x: self.currentValueA, y: 0, type: 'handle-a' }]);

        this.handleB = d3.selectAll('.handle.handle-b')
            .data([{ x: self.currentValueB, y: 0, type: 'handle-b' }]);

        this.handleTextA = this.handleA.selectAll('text');
        this.handleTextB = this.handleB.selectAll('text');

        this.bar.call(drag);
        this.handleA.call(drag);
        this.handleB.call(drag);

        // on a track click, move middle of bar to click position
        this.track.on('click', () => {
            // D3 indicates when click is part of a drag gesture, in which case we ignore the click
            if (d3.event.defaultPrevented) {
                return;
            }
            const lowValue = Math.min(this.currentValueA, this.currentValueB);
            const barWidth = Math.abs(self.currentValueA - self.currentValueB);
            const rangeMid = lowValue + (barWidth / 2) + this.props.padLeft;
            const delta = d3.event.x - rangeMid;
            dragHandler('bar', delta);
        });

        // Called by D3 drag behavior. Applies constraint logic
        // based on which element was dragged and updates positions of the other elements
        function dragHandler(type, delta) {
            const min = 0;
            const max = self.size.trackWidth;
            let nextA = self.currentValueA;
            let nextB = self.currentValueB;

            // stop bar movement at track boundary
            if (type === 'bar') {
                const lowValue = Math.min(nextA, nextB);
                const highValue = Math.max(nextA, nextB);
                const barDeltaMax = max - highValue;
                const barDeltaMin = min - lowValue;

                if (delta > 0 && delta > barDeltaMax) {
                    delta = barDeltaMax;
                } else if (delta < 0 && delta < barDeltaMin) {
                    delta = barDeltaMin;
                }
                nextA += delta;
                nextB += delta;

            // stop handle movement at track boundary
            } else {
                if (type === 'handle-a') {
                    nextA += delta;
                } else {
                    nextB += delta;
                }
                nextA = constrain(nextA, min, max);
                nextB = constrain(nextB, min, max);
            }
            self.updatePositions(nextA, nextB);
        }
    }


    @autobind
    /**
     * Updates SVG element translate positions
     * Sends the onChange event if something changed
     */
    updatePositions(a, b) {
        const barLeft = Math.min(a, b);
        const barRight = Math.max(a, b);

        this.bar.data().x = barLeft;
        this.bar.attr('transform', `translate(${barLeft},${this.size.barY})`);
        this.bar.selectAll('rect').attr('width', barRight - barLeft);

        this.handleA.data().x = a;
        this.handleA.attr('transform', `translate(${a},0)`);
        this.handleTextA.text(this.round(this.scale(a)));

        this.handleB.data().x = b;
        this.handleB.attr('transform', `translate(${b},0)`);
        this.handleTextB.text(this.round(this.scale(b)));

        // change event
        if ((barLeft !== this.currentValueA && barLeft !== this.currentValueB) ||
        (barRight !== this.currentValueA && barRight !== this.currentValueB)) {
            this.currentValueA = a;
            this.currentValueB = b;
            const first = this.props.range[0] < this.props.range[1] ? Math.min(a, b) : Math.max(a, b);
            const second = this.props.range[0] < this.props.range[1] ? Math.max(a, b) : Math.min(a, b);
            this.props.onChange([this.round(this.scale(first)), this.round(this.scale(second))]);
        }
    }


    /**
     * Similar to jQRangeSlider skin: http://ghusse.github.io/jQRangeSlider/demo.html
     */
    renderSVGGradients() {
        return (
            <defs>
                <linearGradient id="grad-handle-box" x1="0" y1="0" x2="0" y2="120%">
                    <stop offset="0%" style={{ stopColor: '#687180', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#888DA0', stopOpacity: 1 }} />
                </linearGradient>
                <linearGradient id="grad-handle-arrow" x1="0" y1="-500%" x2="0" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#687180', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#888DA0', stopOpacity: 1 }} />
                </linearGradient>
                <linearGradient id="grad-track" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#232A32', stopOpacity: 1 }} />
                    <stop offset="5%" style={{ stopColor: '#434952', stopOpacity: 1 }} />
                    <stop offset="20%" style={{ stopColor: '#707880', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#888DA0', stopOpacity: 1 }} />
                </linearGradient>
                <linearGradient id="grad-bar" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#43688A', stopOpacity: 1 }} />
                    <stop offset="10%" style={{ stopColor: '#639ACC', stopOpacity: 1 }} />
                    <stop offset="95%" style={{ stopColor: '#659DD1', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#5F93C4', stopOpacity: 1 }} />
                </linearGradient>
            </defs>
        );
    }


    @autobind
    arrowPath() {
        return [
            `m ${0 - this.handleSize.arrowMid},0`,
            `L ${this.handleSize.arrowMid},0`,
            `L 0,${this.handleSize.arrowHeight}`,
            'z'
        ].join(' ');
    }


    @autobind
    renderHandle(name, value) {
        return (
            <g className={`handle ${name}`} transform={`translate(${value},0)`}>
                <g transform={`translate(${0 - this.handleSize.mid},0)`}>
                    <rect width={this.handleSize.width} height={this.handleSize.boxHeight} rx={this.rc} ry={this.rc} fill="url(#grad-handle-box)" />
                </g>
                <g transform={`translate(0,${this.handleSize.boxHeight})`}>
                    <path d={this.arrowPath()} fill="url(#grad-handle-arrow)"/>
                </g>
                <text x={0} y={this.handleSize.textY} style={{ textAnchor: 'middle' }}>{value}</text>
            </g>
        );
    }


    render() {
        return (
            <svg className="range-slider" width={this.props.width} height={this.props.height}>

                {this.renderSVGGradients()}

                <g className="slider-area" transform={`translate(${this.props.padLeft},0)`}>
                    <g className="track" transform={`translate(0,${this.size.trackY})`}>
                        <rect width={this.size.trackWidth} height={this.props.trackHeight} fill="url(#grad-track)" rx={this.rc} ry={this.rc} />
                        <g className="bar" transform={`translate(${this.currentValueB},${this.size.barY})`}>
                            <rect width={this.currentValueA - this.currentValueB} height={this.size.barHeight} fill="url(#grad-bar)" rx={this.rc} ry={this.rc} />
                        </g>
                        <text className="tick" x={5} y={this.props.trackHeight - 7} style={{ textAnchor: 'start' }}>{this.scale.range()[0]}</text>
                        <text className="tick" x={this.size.trackWidth - 5} y={this.props.trackHeight - 7} style={{ textAnchor: 'end' }}>{this.scale.range()[1]}</text>
                    </g>

                    {this.renderHandle('handle-a', this.currentValueA)}
                    {this.renderHandle('handle-b', this.currentValueB)}
                </g>
            </svg>
        );
    }
};
