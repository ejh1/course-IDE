import React, { useRef } from 'reactn';
import QRCode from 'qrcode';
import { Button } from 'antd';

export const CourseLink = ({code}: {code: string}) => {
    const url = `https://df58kbhysfov4.cloudfront.net/c/${code}`;
    const setImgRef = async (img: any) => img && (img.src = await QRCode.toDataURL(url));
    return (
        <div>
            <img ref={setImgRef} />
            <Button type="link" href={url} target="_blank">Open</Button>
        </div>
    )
}