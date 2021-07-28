import  { useRef, useState } from 'react';
import '../index.css';
import {MaterialDetail}  from '../video_cloud';

interface Props {
    modelPos: { top: number; left: number };
    onHover: VoidFunction;
    onLeave: VoidFunction;
    item: MaterialDetail;
}

export function ScanModel(props: Props) {
    const { modelPos, onHover, onLeave, item } = props;
    const videoRef = useRef<HTMLVideoElement>(null);
    const [duration, setDuration] = useState(0);

    const onLoaded = () => {
        if (videoRef && videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    return (
        <div
            className="playModel"
            style={{
                top: `${modelPos.top}px`,
                left: `${modelPos.left}px`
            }}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
        >
            <video
                autoPlay={true}
                onLoadedData={onLoaded}
                ref={videoRef}
                className="video"
                preload="preload"
                muted
                loop
                src={item.play_url}
                poster={item.post_url}
            />
            <div className="progressContainer">
                <div
                    style={{
                        animation: `progress ${duration}s linear infinite`
                    }}
                    className="progress"
                />
            </div>
        </div>
    );
}
