import { MouseEventHandler } from 'react';
import { toPercent } from '../utils';
import '../index.css';

interface IProps {
    itemWidth: number;
    itemHeight: number;
    margin: number;
    background: string;
    url: string;
    onHover: MouseEventHandler;
    onLeave: VoidFunction;
    onMove: MouseEventHandler;
    ratio: number;
    label?: string;
}

export function CloudItem(props: IProps) {
    const {
        itemWidth,
        itemHeight,
        margin,
        background,
        onHover,
        onLeave,
        onMove,
        url,
        ratio,
        label
    } = props;

    return (
        <div
            className="item"
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
            onMouseMove={onMove}
            style={{
                width: `${itemWidth}px`,
                height: `${itemHeight}px`,
                marginBottom: margin
            }}
        >
            <div className="label" style={{ background }}>
                {itemWidth === 135 && itemHeight === 180 && `${label}：`}
                <div
                    className="ratio"
                    style={{
                        display: 'inline-block',
                        fontSize: '12px',
                        zoom: `${itemWidth < 90 ? 0.83 : 1}`,
                        transformOrigin: '0'
                    }}
                >
                    {toPercent(ratio)}
                </div>
            </div>
            <img alt="" className="image" src={url} />
        </div>
    );
}
