import { editor } from '@overlapmedia/imagemapper';
import React from 'react';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { ReactSketchCanvas } from "react-sketch-canvas";
import { Input } from '@mui/material';
import { UPNG } from './UPNG';


function ImageMapperEditor({ image }) {
    const elementRef = React.useRef(null);
    const canvas = React.createRef();

    const [myEditor, setMyEditor] = React.useState();
    const [shape, setShape] = React.useState();
    const [mode, setMode] = React.useState("select");
    const [brushRadius, setBrushRadius] = React.useState(20);

    const [width, setWidth] = React.useState(0);
    const [height, setHeight] = React.useState(0);

    React.useEffect(() => {
        const myEditor = editor(elementRef.current, {
            componentDrawnHandler: (d) => {
                setShape(d)
                setMode("select")
                myEditor.selectMode()
                console.log(d)
            }
        });
        setMyEditor(myEditor);
        myEditor.loadImage(image);
        myEditor.on('mouseup', (e) => console.log('mouseup event', e));
        myEditor.selectMode();

        getImageSize()
    }, []);

    const getImageSize = () => {
        const img = new Image();
        img.onload = function () {
            setWidth(this.width)
            setHeight(this.height)
        }
        img.src = image;
    }

    function select() {
        myEditor.selectMode()
        setMode("select")
    }

    const draw = (type) => {
        if (type === "rectangle") {
            myEditor.rect()
        } else if (type === "polygon") {
            myEditor.polygon()
        }
        setMode(type)
    }

    function clear() {
        if (shape !== undefined) {
            const x = myEditor.getComponentById(shape.element.id)
            if (x !== undefined) {
                myEditor.removeComponent(x)
                setShape();
            }
        }
        if (mode === "freehand") {
            canvas.current.clearCanvas()
        }
    }

    async function confirm() {
        var url;
        if (mode === "freehand") {
            let data = await canvas.current.exportImage("png")
            let response = await fetch(data)
            let buffer = await response.arrayBuffer()

            const rgba8Img = UPNG.toRGBA8(UPNG.decode(buffer));
            let png = UPNG.encode(rgba8Img, width, height, 2)

            let base64 = await arraybufferToBase64(png)
            
            url = image + "/segment/mask/" + base64
        } else if (shape.dim !== undefined) {
            console.log(shape.dim)
            const x = shape.dim.x
            const w = shape.dim.width
            const h = shape.dim.height
            const y = height - shape.dim.y - h
            url = image + "/segment/rect/" + x + "," + (x + w) + "," + y + "," + (y + h)
        } else if (shape.points !== undefined) {
            console.log(shape.points)
            var points = []
            for (var i = 0; i < shape.points.length; i++) {
                points.push("(" + shape.points[i].x + "," + (height - shape.points[i].y) + ")")
            }
            url = image + "/segment/polygon/" + points.join(",")
        }
        console.log(url)

        fetch(url)
            .then(response => window.open(response.url, "_blank"))
            .catch(e => console.log(e))
    }

    const arraybufferToBase64 = async (data) => {
        const base64url = await new Promise((r) => {
            const reader = new FileReader()
            reader.onload = () => r(reader.result)
            reader.readAsDataURL(new Blob([data]))
        })

        return base64url.substring(base64url.indexOf(',') + 1).replace(/\+/g, '-').replace(/\//g, '_')
    }

    return (
        <>
            {mode === "freehand" ?
                <ReactSketchCanvas
                    ref={canvas}
                    style={{ position: 'absolute' }}
                    width={width}
                    height={height}
                    strokeColor='white'
                    backgroundImage={image}
                    strokeWidth={brushRadius}
                /> : null}
            <svg
                ref={elementRef}
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                width={width}
                height={height}
                viewBox={`0, 0, ${width}, ${height}`}
                preserveAspectRatio="xMinYMin"
            ></svg>
            <Stack spacing={2} direction="row">
                <Button variant={mode === "select" ? "contained" : "text"} onClick={() => select()}>select mode</Button>
                <Button variant={mode === "polygon" ? "contained" : "text"} disabled={shape !== undefined} onClick={() => draw("polygon")}>polygon mode</Button>
                <Button variant={mode === "rectangle" ? "contained" : "text"} disabled={shape !== undefined} onClick={() => draw("rectangle")}>rectangle mode</Button>
                <Button variant={mode === "freehand" ? "contained" : "text"} disabled={shape !== undefined} onClick={() => draw("freehand")}>freehand mode</Button>
                <Input type='number' value={brushRadius} onChange={b => setBrushRadius(b.target.value)}>brush</Input>
            </Stack>
            <Stack spacing={2} direction="row">
                <Button onClick={() => clear()}>clear</Button>
                <Button variant="contained" onClick={() => confirm()}>confirm</Button>
            </Stack>
        </>
    );
}

export default ImageMapperEditor;