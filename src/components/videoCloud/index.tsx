import { useState, useRef } from 'react';
import useKeyframes  from '@/hooks/useKeyframes';
import './index.css';
import { CloudColumns } from './components/CloudColumns';
import { ScanModel } from './components/ScanModal';
import { getListConfig } from './utils';
import { GradeListItem, Rect, MaterialIndexType, MaterialType, MaterialDetail} from './video_cloud';
interface IProps {
    gradeList: GradeListItem[];
    indexType: MaterialIndexType;
    materialType: MaterialType;
}
export default function CreativeCloud(props: IProps) {
    const { gradeList, materialType, indexType } = props;
    useKeyframes();
    const containerRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<ReturnType<Window['setTimeout']>>(null);
    const [hovered, setHovered] = useState(false);
    const [mouseInModel, setMouseInModel] = useState(false);
    const [modelPos, setModePos] = useState({ top: 0, left: 0 });
    const [hoveredItem, setHoveredItem] = useState<MaterialDetail>();

    const getPosition = (pos: Rect): { top: number; left: number } => {
        const containerRect = containerRef!.current!.getBoundingClientRect();
        const { top, left, width, height } = pos;
        let modelTop = top - (320 - height) / 2;
        let modelLeft = left - (180 - width) / 2;

        if (modelTop < containerRect.top + 8) {
            modelTop = containerRect.top + 8;
        } else if (modelTop + 320 > containerRect.bottom - 8) {
            modelTop = containerRect.bottom - 8 - 320;
        }

        if (modelLeft < containerRect.left + 8) {
            modelLeft = containerRect.left + 8;
        } else if (modelLeft + 180 > containerRect.right - 8) {
            modelLeft = containerRect.right - 8 - 180;
        }

        return {
            top: Math.ceil(modelTop),
            left: Math.ceil(modelLeft)
        };
    };

    const onHover = (pos: Rect, item: MaterialDetail) => {
        if (!mouseInModel && materialType === MaterialType.VIDEO) {
            setHovered(true);
            setHoveredItem(item);
            setModePos(getPosition(pos));
        }
    };

    return (
        <>
            <div className="container" ref={containerRef}>
                {gradeList.map((item, index) => (
                    <div
                        className="list"
                        key={index + 1}
                        style={{
                            marginRight: `${getListConfig(index, gradeList.length).marginRight}px`
                        }}
                    >
                        <CloudColumns
                            indexType={indexType}
                            data={item.list}
                            itemHeight={item.height}
                            itemWidth={item.width}
                            background={item.labelColor}
                            margin={item.margin}
                            timeoutRef={timeoutRef}
                            mouseInModel={mouseInModel}
                            handleHover={onHover}
                        />
                    </div>
                ))}
            </div>
            {hovered && hoveredItem && (
                <ScanModel
                    item={hoveredItem}
                    modelPos={modelPos}
                    onHover={() => {
                        setMouseInModel(true);
                    }}
                    onLeave={() => {
                        setMouseInModel(false);
                        setHovered(false);
                    }}
                />
            )}
        </>
    );
}
