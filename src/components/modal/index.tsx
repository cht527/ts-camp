import React, { CSSProperties, PropsWithChildren } from 'react';
import  { createPortal } from 'react-dom';


const modalContainerStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(22, 24, 35, 0.05)',
    justifyContent: 'center',
    alignItems: 'center'
}

const contentStyle: CSSProperties = {
    width: '200px',
    height: '200px',
    backgroundColor: '#fff'
}

interface IProps{
    visible: boolean;
    onClose: ()=> void;
}

export default function Modal({ visible, children, onClose }: PropsWithChildren<IProps>){
    const innerModal =  <div style={{display: visible ? 'flex' :'none',...modalContainerStyle}}>
        <div style={{ ...contentStyle}}>
            {children}
            <button onClick={onClose}>关闭</button>
        </div>
    </div>
    return createPortal(innerModal, document.body)
}


