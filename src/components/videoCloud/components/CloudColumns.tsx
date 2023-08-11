import React, { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import { CloudItem } from './CloudItem';
import {MaterialDetail, Rect, MaterialIndexType}  from '../video_cloud';
interface IProps {
    data: MaterialDetail[];
    itemWidth: number;
    itemHeight: number;
    background: string;
    margin: number;
    mouseInModel: boolean;
    handleHover: (pos: Rect, item: any) => void;
    timeoutRef: MutableRefObject<ReturnType<Window['setTimeout']>|null>;
    indexType: MaterialIndexType;
}

export function CloudColumns(props: IProps) {
    const {
        data,
        itemWidth,
        itemHeight,
        background,
        margin,
        handleHover,
        timeoutRef,
        mouseInModel,
        indexType
    } = props;

    const [hovered, setHovered] = useState(false);
    const [wrapperLeft, setWrapperLeft] = useState(0);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const clear = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, [timeoutRef]);

    const onHover = (e: React.MouseEvent, item: MaterialDetail) => {
        if (!hovered && !mouseInModel) {
            clearTimeout(timeoutRef.current!);
            const { target } = e;
            timeoutRef.current = window.setTimeout(() => {
                const rect = (target as HTMLDivElement).getBoundingClientRect();
                const { top, width, height } = rect;
                setHovered(true);
                handleHover({ top, left: wrapperLeft, width, height }, item);
            }, 50);
        }
    };

    useEffect(() => {
        const setLeft = () => {
            const { left } = wrapperRef.current?.getBoundingClientRect() ?? {left: 0};
            setWrapperLeft(Math.ceil(left));
        };
        window.addEventListener('resize', setLeft);
        return window.removeEventListener('resize', setLeft);
    }, []);

    useEffect(() => {
        if (!mouseInModel) {
            hovered && setHovered(false);
            clear();
        }
    }, [mouseInModel, hovered, clear]);

    useEffect(() => {
        const { left } = wrapperRef.current?.getBoundingClientRect() ?? {left: 0};
        setWrapperLeft(Math.ceil(left));
    }, []);

    const getDisplayRatio = useCallback(
        (item: MaterialDetail) => {
            switch (indexType) {
                case MaterialIndexType.SHOW:
                    return {
                        label: '曝光占比',
                        ratio: item.show_ratio
                    };
                case MaterialIndexType.VV_FINISH:
                    return {
                        label: '完播次数占比',
                        ratio: item.play_over_ratio
                    };
                case MaterialIndexType.CONVERT:
                    return {
                        label: '转化占比',
                        ratio: item.convert_rate
                    };
                default:
                    return {
                        label: '曝光占比',
                        ratio: item.show_ratio
                    };
            }
        },
        [indexType]
    );

    return (
        <div ref={wrapperRef}>
            {data.map(item => (
                <CloudItem
                    ratio={getDisplayRatio(item).ratio}
                    label={getDisplayRatio(item).label}
                    url={item.post_url}
                    key={item.material_id}
                    itemWidth={itemWidth}
                    itemHeight={itemHeight}
                    margin={margin}
                    background={background}
                    onHover={e => {
                        onHover(e, item);
                    }}
                    onLeave={clear}
                    onMove={e => {
                        onHover(e, item);
                    }}
                />
            ))}
        </div>
    );
}
