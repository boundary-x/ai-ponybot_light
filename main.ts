/**
 * Well known colors for a NeoPixel strip
 */
enum NeoPixelColors {
    //% block=빨간색(red)
    Red = 0xFF0000,
    //% block=주황색(orange)
    Orange = 0xFFA500,
    //% block=노란색(yellow)
    Yellow = 0xFFFF00,
    //% block=초록색(green)
    Green = 0x00FF00,
    //% block=파란색(blue)
    Blue = 0x0000FF,
    //% block=남색(indigo)
    Indigo = 0x000080,
    //% block=보라색(violet)
    Violet = 0x8a2be2,
    //% block=흰색(white)
    White = 0xFFFFFF,
    //% block=끄기
    black = 0x000000
}

/**
 * Different modes for RGB or RGB+W NeoPixel strips
 */
enum NeoPixelMode {
    //% block="RGB (GRB format)"
    RGB = 1,
    //% block="RGB+W"
    RGBW = 2,
    //% block="RGB (RGB format)"
    RGB_RGB = 3
}

/**
 * Functions to operate NeoPixel strips.
 */
//% weight=5 color=#58ACFA icon="\uf057" block="ponybot light"
namespace neopixel {
    /**
     * A NeoPixel strip
     */
    export class Strip {
        buf: Buffer;
        pin: DigitalPin;
        // TODO: encode as bytes instead of 32bit
        brightness: number;
        start: number; // start offset in LED strip
        _length: number; // number of LEDs
        _mode: NeoPixelMode;
        _matrixWidth: number; // number of leds in a matrix - if any

        //--------------------------라이트 제어(기초)------------------------------------
        /**
         * Shows all LEDs to a given color (range 0-255 for r, g, b).
         * @param rgb RGB color of the LED
         */
        //% blockId="neopixel_set_strip_color" block="%strip| 라이트를 모두 %rgb=neopixel_colors| 으로 켜기 "
        //% strip.defl=strip
        //% weight=70 blockGap=8
        //% group="라이트 제어(기초)"
        showColor(rgb: number) {
            rgb = rgb >> 0;
            this.setAllRGB(rgb);
            this.show();
        }


        //--------------------------라이트 제어(심화)------------------------------------
        /**
         * Shows a rainbow pattern on all LEDs.
         * @param startHue the start hue value for the rainbow, eg: 1
         * @param endHue the end hue value for the rainbow, eg: 360
         */
        //% group="라이트 제어(심화)"
        //% blockId="neopixel_set_strip_rainbow" block="%strip|라이트 무지개 효과 - 시작색: %startHue|, 종료색: %endHue"
        //% strip.defl=strip
        //% weight=70 blockGap=8
        //%startHue.min=0 startHue.max=360
        //%endHue.min=0 endHue.max=360
        showRainbow(startHue: number = 1, endHue: number = 360) {
            if (this._length <= 0) return;

            startHue = startHue >> 0;
            endHue = endHue >> 0;
            const saturation = 100;
            const luminance = 50;
            const steps = this._length;
            const direction = HueInterpolationDirection.Clockwise;

            //hue
            const h1 = startHue;
            const h2 = endHue;
            const hDistCW = ((h2 + 360) - h1) % 360;
            const hStepCW = Math.idiv((hDistCW * 100), steps);
            const hDistCCW = ((h1 + 360) - h2) % 360;
            const hStepCCW = Math.idiv(-(hDistCCW * 100), steps);
            let hStep: number;
            if (direction === HueInterpolationDirection.Clockwise) {
                hStep = hStepCW;
            } else if (direction === HueInterpolationDirection.CounterClockwise) {
                hStep = hStepCCW;
            } else {
                hStep = hDistCW < hDistCCW ? hStepCW : hStepCCW;
            }
            const h1_100 = h1 * 100; //we multiply by 100 so we keep more accurate results while doing interpolation

            //sat
            const s1 = saturation;
            const s2 = saturation;
            const sDist = s2 - s1;
            const sStep = Math.idiv(sDist, steps);
            const s1_100 = s1 * 100;

            //lum
            const l1 = luminance;
            const l2 = luminance;
            const lDist = l2 - l1;
            const lStep = Math.idiv(lDist, steps);
            const l1_100 = l1 * 100

            //interpolate
            if (steps === 1) {
                this.setPixelColor(0, hsl(h1 + hStep, s1 + sStep, l1 + lStep))
            } else {
                this.setPixelColor(0, hsl(startHue, saturation, luminance));
                for (let i = 1; i < steps - 1; i++) {
                    const h = Math.idiv((h1_100 + i * hStep), 100) + 360;
                    const s = Math.idiv((s1_100 + i * sStep), 100);
                    const l = Math.idiv((l1_100 + i * lStep), 100);
                    this.setPixelColor(i, hsl(h, s, l));
                }
                this.setPixelColor(steps - 1, hsl(endHue, saturation, luminance));
            }
            this.show();
        }

        /**
         * Displays a vertical bar graph based on the `value` and `high` value.
         * If `high` is 0, the chart gets adjusted automatically.
         * @param value current value to plot
         * @param high maximum value, eg: 255
         */
        //% group="라이트 제어(심화)"
        //% weight=60 blockGap=8
        //% blockId=neopixel_show_bar_graph block="%strip|라이트 그래프 효과 - 그래프로 나타낼 값: %value|, 최대값: %high"
        //% strip.defl=strip
        showBarGraph(value: number, high: number): void {
            if (high <= 0) {
                this.clear();
                this.setPixelColor(0, NeoPixelColors.Yellow);
                this.show();
                return;
            }

            value = Math.abs(value);
            const n = this._length;
            const n1 = n - 1;
            let v = Math.idiv((value * n), high);
            if (v == 0) {
                this.setPixelColor(0, 0x666600);
                for (let i = 1; i < n; ++i)
                    this.setPixelColor(i, 0);
            } else {
                for (let i = 0; i < n; ++i) {
                    if (i <= v) {
                        const b = Math.idiv(i * 255, n1);
                        this.setPixelColor(i, neopixel.rgb(b, 0, 255 - b));
                    }
                    else this.setPixelColor(i, 0);
                }
            }
            this.show();
        }

        /**
         * Set LED to a given color (range 0-255 for r, g, b).
         * You need to call ``show`` to make the changes visible.
         * @param pixeloffset position of the NeoPixel in the strip
         * @param rgb RGB color of the LED
         */
        //% group="라이트 제어(심화)"
        //% blockId="neopixel_set_pixel_color" block="%strip|의 %pixeloffset|번째 라이트 색상을 %rgb=neopixel_colors으로 설정하기"
        //% strip.defl=strip
        //% blockGap=8
        //% weight=90
        setPixelColor(pixeloffset: number, rgb: number): void {
            this.setPixelRGB(pixeloffset >> 0, rgb >> 0);
        }


        /**
         * Send all the changes to the strip.
         */
        //% group="라이트 제어(심화)"
        //% blockId="neopixel_show" block="%strip|라이트를 설정한대로 켜기" blockGap=8
        //% strip.defl=strip
        //% weight=80
        show() {
            // only supported in beta
            // ws2812b.setBufferMode(this.pin, this._mode);
            ws2812b.sendBuffer(this.buf, this.pin);
        }

        /**
         * Turn off all LEDs.
         * You need to call ``show`` to make the changes visible.
         */
        //% group="라이트 제어(기초)"
        //% blockId="neopixel_clear" block="%strip|라이트 모두 끄기" blockGap=8
        //% strip.defl=strip
        //% weight=60
        clear(): void {
            const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            this.buf.fill(0, this.start * stride, this._length * stride);
            this.show();
        }

        /**
         * Gets the number of pixels declared on the strip
         */
        //% group="라이트 제어(심화)"
        //% blockId="neopixel_length" block="%strip|라이트의 개수" blockGap=8
        //% strip.defl=strip
        //% weight=100
        length() {
            return this._length;
        }

        /**
         * Set the brightness of the strip. This flag only applies to future operation.
         * @param brightness a measure of LED brightness in 0-255. eg: 255
         */
        //% group="라이트 제어(기초)"
        //% blockId="neopixel_set_brightness" block="%strip|라이트의 밝기를 %brightness로 변경하기" blockGap=8
        //% strip.defl=strip
        //% weight=80
        setBrightness(brightness: number): void {
            this.brightness = brightness & 0xff;
        }


        /**
         * Create a range of LEDs.
         * @param start offset in the LED strip to start the range
         * @param length number of LEDs in the range. eg: 4
         */
        //% group="라이트 제어(기초)"
        //% weight=90
        //% blockId="neopixel_range" block="%strip|의 %start|번째부터 %length|개의 라이트(LED) "
        //% strip.defl=strip
        //% length.defl=3
        //% blockSetVariable=range

        range(start: number, length: number): Strip {
            start = start >> 0;
            length = length >> 0;
            let strip = new Strip();
            strip.buf = this.buf;
            strip.pin = this.pin;
            strip.brightness = this.brightness;
            strip.start = this.start + Math.clamp(0, this._length - 1, start);
            strip._length = Math.clamp(0, this._length - (strip.start - this.start), length);
            strip._matrixWidth = 0;
            strip._mode = this._mode;
            return strip;
        }

        /**
         * Set the pin where the neopixel is connected, defaults to P0.
         */
        //% weight=10
        setPin(pin: DigitalPin): void {
            this.pin = pin;
            pins.digitalWritePin(this.pin, 0);
            // don't yield to avoid races on initialization
        }

        private setBufferRGB(offset: number, red: number, green: number, blue: number): void {
            if (this._mode === NeoPixelMode.RGB_RGB) {
                this.buf[offset + 0] = red;
                this.buf[offset + 1] = green;
            } else {
                this.buf[offset + 0] = green;
                this.buf[offset + 1] = red;
            }
            this.buf[offset + 2] = blue;
        }

        private setAllRGB(rgb: number) {
            let red = unpackR(rgb);
            let green = unpackG(rgb);
            let blue = unpackB(rgb);

            const br = this.brightness;
            if (br < 255) {
                red = (red * br) >> 8;
                green = (green * br) >> 8;
                blue = (blue * br) >> 8;
            }
            const end = this.start + this._length;
            const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            for (let i = this.start; i < end; ++i) {
                this.setBufferRGB(i * stride, red, green, blue)
            }
        }
        private setAllW(white: number) {
            if (this._mode !== NeoPixelMode.RGBW)
                return;

            let br = this.brightness;
            if (br < 255) {
                white = (white * br) >> 8;
            }
            let buf = this.buf;
            let end = this.start + this._length;
            for (let i = this.start; i < end; ++i) {
                let ledoffset = i * 4;
                buf[ledoffset + 3] = white;
            }
        }
        private setPixelRGB(pixeloffset: number, rgb: number): void {
            if (pixeloffset < 0
                || pixeloffset >= this._length)
                return;

            let stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            pixeloffset = (pixeloffset + this.start) * stride;

            let red = unpackR(rgb);
            let green = unpackG(rgb);
            let blue = unpackB(rgb);

            let br = this.brightness;
            if (br < 255) {
                red = (red * br) >> 8;
                green = (green * br) >> 8;
                blue = (blue * br) >> 8;
            }
            this.setBufferRGB(pixeloffset, red, green, blue)
        }
        private setPixelW(pixeloffset: number, white: number): void {
            if (this._mode !== NeoPixelMode.RGBW)
                return;

            if (pixeloffset < 0
                || pixeloffset >= this._length)
                return;

            pixeloffset = (pixeloffset + this.start) * 4;

            let br = this.brightness;
            if (br < 255) {
                white = (white * br) >> 8;
            }
            let buf = this.buf;
            buf[pixeloffset + 3] = white;
        }
    }

    /**
     * Create a new NeoPixel driver for `numleds` LEDs.
     * @param pin the pin where the neopixel is connected.
     * @param numleds number of leds in the strip, eg: 24,30,60,64
     */
    //% blockId="neopixel_create" block="%pin|에 연결된 %numleds|개의 %mode|타입 라이트"
    //% group="라이트 제어(기초)"
    //% weight=100 blockGap=8
    //% parts="neopixel"
    //% trackArgs=0,2
    //% blockSetVariable=strip
    //% pin.defl=DigitalPin.P8
    //% numleds.defl=4
    export function create(pin: DigitalPin, numleds: number, mode: NeoPixelMode): Strip {
        let strip = new Strip();
        let stride = mode === NeoPixelMode.RGBW ? 4 : 3;
        strip.buf = pins.createBuffer(numleds * stride);
        strip.start = 0;
        strip._length = numleds;
        strip._mode = mode || NeoPixelMode.RGB;
        strip._matrixWidth = 0;
        strip.setBrightness(128)
        strip.setPin(pin)
        return strip;
    }

    /**
     * Converts red, green, blue channels into a RGB color
     * @param red value of the red channel between 0 and 255. eg: 255
     * @param green value of the green channel between 0 and 255. eg: 255
     * @param blue value of the blue channel between 0 and 255. eg: 255
     */
    //% weight=20 blockGap=8
    //% group="색상 블록"
    //% blockId="neopixel_rgb" block="빨강(R): %red|초록(G): %green|파랑(B): %blue"
    //% red.min=0 red.max=255
    //% green.min=0 green.max=255
    //% blue.min=0 blue.max=255
    export function rgb(red: number, green: number, blue: number): number {
        return packRGB(red, green, blue);
    }

    //% weight=40 blockGap=8
    //% group="색상 블록"
    //% blockId="pick_color_packrgb" block="색상 선택 %color"
    //% color.shadow="colorNumberPicker"
    export function pickColorPackRGB(color: number): number {
        const red = unpackR(color);
        const green = unpackG(color);
        const blue = unpackB(color);
        return packRGB(red, green, blue);
    }

    //-------------------------------------색상 블록--------------------------------------
    /**
     * Gets the RGB value of a known color
    */
    //% group="색상 블록"
    //% weight=30 blockGap=8
    //% blockId="neopixel_colors" block="%color"
    export function colors(color: NeoPixelColors): number {
        return color;
    }

    function packRGB(a: number, b: number, c: number): number {
        return ((a & 0xFF) << 16) | ((b & 0xFF) << 8) | (c & 0xFF);
    }
    function unpackR(rgb: number): number {
        let r = (rgb >> 16) & 0xFF;
        return r;
    }
    function unpackG(rgb: number): number {
        let g = (rgb >> 8) & 0xFF;
        return g;
    }
    function unpackB(rgb: number): number {
        let b = (rgb) & 0xFF;
        return b;
    }

    /**
     * Converts a hue saturation luminosity value into a RGB color
     * @param h hue from 0 to 360
     * @param s saturation from 0 to 99
     * @param l luminosity from 0 to 99
     */
    //% group="색상 블록"
    //% weight=2
    //% blockId=neopixelHSL block="색조(H): %h|채도(S): %s|명도(L): %l"
    export function hsl(h: number, s: number, l: number): number {
        h = Math.round(h);
        s = Math.round(s);
        l = Math.round(l);

        h = h % 360;
        s = Math.clamp(0, 99, s);
        l = Math.clamp(0, 99, l);
        let c = Math.idiv((((100 - Math.abs(2 * l - 100)) * s) << 8), 10000); //chroma, [0,255]
        let h1 = Math.idiv(h, 60);//[0,6]
        let h2 = Math.idiv((h - h1 * 60) * 256, 60);//[0,255]
        let temp = Math.abs((((h1 % 2) << 8) + h2) - 256);
        let x = (c * (256 - (temp))) >> 8;//[0,255], second largest component of this color
        let r$: number;
        let g$: number;
        let b$: number;
        if (h1 == 0) {
            r$ = c; g$ = x; b$ = 0;
        } else if (h1 == 1) {
            r$ = x; g$ = c; b$ = 0;
        } else if (h1 == 2) {
            r$ = 0; g$ = c; b$ = x;
        } else if (h1 == 3) {
            r$ = 0; g$ = x; b$ = c;
        } else if (h1 == 4) {
            r$ = x; g$ = 0; b$ = c;
        } else if (h1 == 5) {
            r$ = c; g$ = 0; b$ = x;
        }
        let m = Math.idiv((Math.idiv((l * 2 << 8), 100) - c), 2);
        let r = r$ + m;
        let g = g$ + m;
        let b = b$ + m;
        return packRGB(r, g, b);
    }

    export enum HueInterpolationDirection {
        Clockwise,
        CounterClockwise,
        Shortest
    }
    //------------------------------------비활성 블록-------------------------------------------
    /**
     * Sets the number of pixels in a matrix shaped strip
     * @param width number of pixels in a row
    
    //% blockId=neopixel_set_matrix_width block="%strip|set matrix width %width"
    //% strip.defl=strip
    //% blockGap=8
    //% weight=5
    setMatrixWidth(width: number) {
        this._matrixWidth = Math.min(this._length, width >> 0);
    }
    */

    /**
     * Set LED to a given color (range 0-255 for r, g, b) in a matrix shaped strip
     * You need to call ``show`` to make the changes visible.
     * @param x horizontal position
     * @param y horizontal position
     * @param rgb RGB color of the LED
    
    //% blockId="neopixel_set_matrix_color" block="%strip|set matrix color at x %x|y %y|to %rgb=neopixel_colors"
    //% strip.defl=strip
    //% weight=4
    setMatrixColor(x: number, y: number, rgb: number) {
        if (this._matrixWidth <= 0) return; // not a matrix, ignore
        x = x >> 0;
        y = y >> 0;
        rgb = rgb >> 0;
        const cols = Math.idiv(this._length, this._matrixWidth);
        if (x < 0 || x >= this._matrixWidth || y < 0 || y >= cols) return;
        let i = x + y * this._matrixWidth;
        this.setPixelColor(i, rgb);
    }
    */

    /**
     * For NeoPixels with RGB+W LEDs, set the white LED brightness. This only works for RGB+W NeoPixels.
     * @param pixeloffset position of the LED in the strip
     * @param white brightness of the white LED
    //% blockId="neopixel_set_pixel_white" block="%strip|set pixel white LED at %pixeloffset|to %white"
    //% strip.defl=strip
    //% blockGap=8
    //% weight=80
    setPixelWhiteLED(pixeloffset: number, white: number): void {
        if (this._mode === NeoPixelMode.RGBW) {
            this.setPixelW(pixeloffset >> 0, white >> 0);
        }
    }
    */

    /**
     * Apply brightness to current colors using a quadratic easing function.
    
    //% blockId="neopixel_each_brightness" block="%strip|ease brightness" blockGap=8
    //% strip.defl=strip
    //% weight=58
    easeBrightness(): void {
        const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
        const br = this.brightness;
        const buf = this.buf;
        const end = this.start + this._length;
        const mid = Math.idiv(this._length, 2);
        for (let i = this.start; i < end; ++i) {
            const k = i - this.start;
            const ledoffset = i * stride;
            const br = k > mid
                ? Math.idiv(255 * (this._length - 1 - k) * (this._length - 1 - k), (mid * mid))
                : Math.idiv(255 * k * k, (mid * mid));
            const r = (buf[ledoffset + 0] * br) >> 8; buf[ledoffset + 0] = r;
            const g = (buf[ledoffset + 1] * br) >> 8; buf[ledoffset + 1] = g;
            const b = (buf[ledoffset + 2] * br) >> 8; buf[ledoffset + 2] = b;
            if (stride == 4) {
                const w = (buf[ledoffset + 3] * br) >> 8; buf[ledoffset + 3] = w;
            }
        }
    }
    */

    /**
    * Estimates the electrical current (mA) consumed by the current light configuration.
    */
    //% strip.defl=strip
    // power(): number {
    //     const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
    //     const end = this.start + this._length;
    //     let p = 0;
    //     for (let i = this.start; i < end; ++i) {
    //         const ledoffset = i * stride;
    //         for (let j = 0; j < stride; ++j) {
    //             p += this.buf[i + j];
    //         }
    //     }
    //     return Math.idiv(this.length() * 7, 10) /* 0.7mA per neopixel */
    //         + Math.idiv(p * 480, 10000); /* rought approximation */
    // }

    /**
     * Shift LEDs forward and clear with zeros.
     * You need to call ``show`` to make the changes visible.
     * @param offset number of pixels to shift forward, eg: 1
         
    //% blockId="neopixel_shift" block="%strip|shift pixels by %offset" blockGap=8
    //% strip.defl=strip
    //% weight=40
    shift(offset: number = 1): void {
        offset = offset >> 0;
        const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
        this.buf.shift(-offset * stride, this.start * stride, this._length * stride)
    }
    */

    /**
     * Rotate LEDs forward.
     * You need to call ``show`` to make the changes visible.
     * @param offset number of pixels to rotate forward, eg: 1
         
    //% blockId="neopixel_rotate" block="%strip|rotate pixels by %offset" blockGap=8
    //% strip.defl=strip
    //% weight=39
    rotate(offset: number = 1): void {
        offset = offset >> 0;
        const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
        this.buf.rotate(-offset * stride, this.start * stride, this._length * stride)
    }
    */
}