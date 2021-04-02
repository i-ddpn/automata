const BORDER_TYPE = {
          BLANK: 0,
          TORUS: 1
      },
      DIMENSION = {
          ONE_D: 0,
          TWO_D: 1
      };

Object.getOwnPropertyNames(Math).forEach(el => window[el] = Math[el]);

const maps = {
    "Случайное": (i, j, field) => floor(random() * field.numberOfStates),
    "Горизонтальные линии": (i, j, field) => field.numberOfStates - i % field.numberOfStates - 1,
    "Вертикальные линии": (i, j, field) => field.numberOfStates - j % field.numberOfStates - 1,
    "Шахматный порядок": (i, j, field) => field.numberOfStates - (i + j) % field.numberOfStates - 1,
    "Линия по середние (в.)": (i, j, field) => j === floor(field.width / 2) ? 1 : 0,
    "Линия по середние (г.)": (i, j, field) => i === floor(field.height / 2) ? 1 : 0,
    "Точка в центре": (i, j, field) => i === floor(field.height / 2) && j === floor(field.width / 2) ? 1 : 0,
    "Точка слева": (i, j, field) => j === 0 ? 1 : 0,
    "Круг": (i, j, field) => {
        const radius = field.height / 10;
        const centerX = field.width / 2;
        const centerY = field.height / 2;
        const angle = j === centerX ? PI / 2 : atan((centerY - i) / (j - centerX));
        const shiftY = abs(radius * sin(angle));
        const shiftX = abs(radius * cos(angle));
        return i >= round(centerY - shiftY) &&
                i <= round(centerY + shiftY) &&
                j >= round(centerX - shiftX) &&
                j <= round(centerX + shiftX) ? 1 : 0
    },
    "Квадрат": (i, j, field) =>
        i >= floor(field.height / 2 - field.height / 10) &&
        i <= floor(field.height / 2 + field.height / 10) &&
        j >= floor(field.width / 2 - field.width / 10) &&
        j <= floor(field.width / 2 + field.width / 10) ? 1 : 0
};

const rules = [
    {
        "Случайная": (_, automaton) => floor(random() * automaton.field.numberOfStates),
        "Сумма соседей": ([a, _, b], automaton) => (a + b) % automaton.field.numberOfStates,
        "Синхронизация": ([Лево, Центр, Право]) => {
            const [Г, Н, Ч, С1, С2, ЗП, ЗЛ, К, Ж] = [0, 1, 2, 3, 4, 5, 6, 7, 8];

            const F = (Л, Ц, П) => {
                const check = (x, y) => x.includes(Л) && y.includes(П);

                if (Ц === Н) {
                    // Правило 1
                    if (check([Н, ЗЛ, С1], [ЗП, С1]) || check([Н, С2], [Н, С2])) return Н;
                    // Правило 4
                    if (check([К, Ч], [Н, ЗП, С1, С2])) return К;
                    // Правило 6
                    if (check([ЗП], [Н, С1, С2])) return ЗП;
                    // На границе
                    if (П === Г && Л === К) return Ч; 
                }
                if (Ц === ЗП) {
                    // Правило 2
                    if (check([Н, К, ЗЛ, С1], [Н]) || check([Н, С2], [К, ЗП])) return Н;
                    // Правило 5
                    if (check([Н, С2], [Ч])) return К;
                    // Правило 8
                    if (check([ЗП, Ч], [Н]) || check([ЗЛ], [ЗП])) return ЗП;
                    // Правило 9
                    if (check([ЗП, Ч], [ЗП])) return ЗЛ;
                    // Правило 11
                    if (check([Н], [С2])) return С1;
                    // Правило 13
                    if (check([К, ЗЛ, С1], [Ч]) || check([Н], [С1])) return С2;
                    // Правило 18
                    if (check([ЗП], [С1, С2])) return Ч;
                }
                if (Ц === С1) {
                    // Правило 3
                    if (check([ЗП], [Н, С2])) return Н;
                    // Правило 12
                    if (check([Н], [Н, ЗП, С2])) return С1;
                }
                if (Ц === К) {
                    // Правило 7
                    if (check([ЗЛ], [Н, С2]) || check([Н, С1], [ЗЛ, Ч])) return ЗП;
                    // Правило 17
                    if (check([ЗП, Ч], [С2]) || check([ЗЛ], [С1])) return Ч;
                }
                if (Ц === С2) {
                    // Правило 10
                    if (check([Н, Ч], [ЗЛ])) return ЗЛ;
                    // Правило 14
                    if (check([Н, ЗЛ, С1], [Ч]) || check([Н], [Н])) return С2;
                }
                if (Ц === Ч) {
                    // Правило 19
                    if (
                        check([Н, ЗП, ЗЛ, Ч], [Н, ЗЛ]) || 
                        check([С2], [ЗП, С2, Ч]) ||
                        check([ЗЛ], [ЗП]) ||
                        check([К], [К, ЗП, Ч])
                    ) return Ч;
                    // Правило 20
                    if (check([Ч, Г], [Ч, Г])) return Ж;
                }
                if (Ц === Ж) {
                    // Правило 21
                    if (check([Ж, Г], [Ж, Г])) return Н;
                }
                // Правило 15
                if (check([Ч], [Ч]) && [Н, ЗП, С2].includes(Ц)) return Ч;
                // Правило 16
                if (
                    check([К], [Н, ЗП, С2]) && [С1].includes(Ц) ||
                    check([К], [К]) && [Н].includes(Ц) ||
                    check([К], [Н, Ч]) && [С2].includes(Ц)
                ) return Ч;

                return false;
            }

            let result = F(Лево, Центр, Право);
            if (result === false) {
                const reverse = state => {
                    if (state === ЗЛ) return ЗП;
                    if (state === ЗП) return ЗЛ;
                    return state;
                }
                result = reverse(F(reverse(Право), reverse(Центр), reverse(Лево)));
            }
            if (result === false) result = Центр;
            return result;
        }
    },
    {
        "Жизнь": (neighbourhood, automaton) => {
            let neighbours = 0;
            for (let i = 0; i < neighbourhood.length; i++) {
                if (neighbourhood[i] === 1 && i !== automaton.neighbourhoodCenter) {
                    neighbours++;
                }
            }

            return (neighbours === 2 && neighbourhood[automaton.neighbourhoodCenter] === 1 || neighbours === 3) ? 1 : 0;
        },
        "Случайная": (_, automaton) => floor(random() * automaton.field.numberOfStates),
        "Фрактал": (neighbourhood, automaton) => abs((neighbourhood.reduce((cur, acc) => cur + acc, 0) - neighbourhood[automaton.neighbourhoodCenter]) % 2 - neighbourhood[automaton.neighbourhoodCenter]) % 2,
        "hglass": ([N, W, C, E, S]) => [1, 2, 3, 11, 21, 25, 29, 30, 31].includes(16*E + 8*W + 4*S + 2*N + C) ? 1 : 0
    }
];

class Field {
    constructor(width = 60, height = 60, dimension = DIMENSION.TWO_D) {
        this.width = width;
        this.height = height;
        this.dimension = dimension;
        this.currentLine;
        this.generation;
        this.statesMap;
        this.statesColors;
    }

    get numberOfStates() {
        return this.statesColors.length;
    }

    get atBottom() {
        return this.currentLine === this.height - 1;
    }

    clearStates() {
        this.statesColors = [];
    }

    addState(color) {
        this.statesColors.push(color);
    }

    setMap(map) {
        this.currentLine = 0;
        this.generation = 0;
        this.statesMap = [];
        for (let i = 0; i < this.height; i++) {
            this.statesMap[i] = [];
            for (let j = 0; j < this.width; j++) {
                this.statesMap[i][j] = (this.dimension === DIMENSION.TWO_D || this.dimension === DIMENSION.ONE_D && i === 0) ? map(i, j, this) : 0;
            }
        }
    }

    shiftMapUp() {
        this.statesMap.shift();
        this.statesMap.push([]);
        for (let i = 0; i < this.width; i++) {
            this.statesMap[this.height - 1][i] = 0;
        }
    }
}

class CAutomaton {
    constructor(field, borderType = BORDER_TYPE.BLANK) {
        this.field = field;
        this.borderType = borderType;
        this.neighbourhoodAreaSize;
        this.neighbourhoodMap;
        this.neighbourhoodMapReversed;
        this.neighbourhoodLength;
        this.transitions = [];
    }

    get maxTransitionNumber() {
        return this.field.numberOfStates**this.neighbourhoodLength - 1;
    }

    get maxWolframCode() {
        return this.field.numberOfStates**(this.field.numberOfStates**this.neighbourhoodLength) - 1;
    }

    get map() {
        const map = [];
        const rect = App.getRectInfo(this.neighbourhoodAreaSize, this.field.dimension);
        for (let i = 0; i < rect.height; i++) {
            const shiftedI = i - rect.centerY;
            map[i] = [];
            for (let j = 0; j < rect.width; j++) {
                const shiftedJ = j - rect.centerX;
                map[i][j] = this.neighbourhoodMap[shiftedI][shiftedJ] === -1 ? 0 : 1;
            }
        }
        return map;
    }

    applyTransitionsRule(rule) {
        this.transitions = [];
        for (let i = 0; i < this.field.numberOfStates**this.neighbourhoodLength; i++) {
            const states = [];
            let neighbourhood = i;
            for (let j = 0; j < this.neighbourhoodLength; j++) {
                states.unshift(neighbourhood % this.field.numberOfStates);
                neighbourhood = Math.floor(neighbourhood / this.field.numberOfStates);
            }
            this.transitions[i] = rule(states, this);
        }
    }

    setNeighbourhood(size = 3, map = []) {
        this.neighbourhoodAreaSize = size;
        this.neighbourhoodMap = [];
        this.neighbourhoodMapReversed = [];
        this.neighbourhoodLength = 0;
        const defualtMap = map.length === 0;
        const rect = App.getRectInfo(this.neighbourhoodAreaSize, this.field.dimension);
        for (let i = rect.height - 1; i >= 0; i--) {
            const shiftedI = i - rect.centerY;
            this.neighbourhoodMap[shiftedI] = [];
            for (let j = rect.width - 1; j >= 0; j--) {
                const shiftedJ = j - rect.centerX;
                if (i === rect.centerY && j === rect.centerX) {
                    this.neighbourhoodCenter = this.neighbourhoodLength;
                }
                if (defualtMap || map[i][j] === 1) {
                    this.neighbourhoodMap[shiftedI][shiftedJ] = this.neighbourhoodLength;
                    this.neighbourhoodMapReversed[this.neighbourhoodLength++] = { x: shiftedJ, y: shiftedI };
                } else {
                    this.neighbourhoodMap[shiftedI][shiftedJ] = -1;
                }
            }
        }
    }

    getTransition(transitionNumber) {
        let transition = this.transitions[transitionNumber];
        if (transition === undefined) {
            transition = 0;
        }
        return transition;
    }

    step() {
        if (this.field.dimension === DIMENSION.ONE_D) {
            if (this.field.atBottom) {
                this.field.shiftMapUp();
            } else {
                this.field.currentLine++;
            }
            let y = this.field.currentLine - 1;
            for (let j = 0; j < this.field.width; j++) {
                let transitionNumber = 0;
                for (let k = 0; k < this.neighbourhoodLength; k++) {
                    let x = j + this.neighbourhoodMapReversed[k].x;
                    let state = 0;
                    if (x >= 0 && x < this.field.width) {
                        state = this.field.statesMap[y][x];
                    } else {
                        if (this.borderType === BORDER_TYPE.TORUS) {
                            if (x < 0) {
                                x = this.field.width + x;
                            } else if (x >= this.field.width) {
                                x = x - this.field.width;
                            }
                            state = this.field.statesMap[y][x];
                        }
                    }
                    transitionNumber += state * this.field.numberOfStates**k;
                }
                this.field.statesMap[this.field.currentLine][j] = this.getTransition(transitionNumber);
            }
        } else if (this.field.dimension === DIMENSION.TWO_D) {
            const newStatesMap = [];
            for (let i = 0; i < this.field.height; i++) {
                newStatesMap[i] = [];
                for (let j = 0; j < this.field.width; j++) {
                    let transitionNumber = 0;
                    for (let k = 0; k < this.neighbourhoodLength; k++) {
                        let x = j + this.neighbourhoodMapReversed[k].x;
                        let y = i + this.neighbourhoodMapReversed[k].y;
                        let state = 0;
                        if (x >= 0 && y >= 0 && x < this.field.width && y < this.field.height) {
                            state = this.field.statesMap[y][x];
                        } else {
                            if (this.borderType === BORDER_TYPE.TORUS) {
                                if (x < 0) {
                                    x = this.field.width + x;
                                } else if (x >= this.field.width) {
                                    x = x - this.field.width;
                                }
                                if (y < 0) {
                                    y = this.field.height + y;
                                } else if (y >= this.field.height) {
                                    y = y - this.field.height;
                                }
                                state = this.field.statesMap[y][x];
                            }
                        }
                        transitionNumber += state * this.field.numberOfStates**k;
                    }
                    newStatesMap[i][j] = this.getTransition(transitionNumber);
                }
            }
            this.field.statesMap = newStatesMap;
        }
        this.field.generation++;
    }
}

class SVG {
    constructor(field) {
        this.field = field;
        this.viewBox = {
            width: this.field.width,
            height: this.field.height,
            x: 0,
            y: 0
        };
        this.svgElement;
        this.image;
        this.canvas;
        this.ctx;
    }

    createSvgElement() {
        const el = document.getElementById('svg');
        const clonedNode = el.cloneNode(false);
        el.parentNode.replaceChild(clonedNode, el);
        this.svgElement = clonedNode;
        this.image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        this.image.setAttribute("width", this.field.width);
        this.image.setAttribute("height", this.field.height);
        this.image.setAttribute("x", "0");
        this.image.setAttribute("y", "0");
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.field.width;
        this.canvas.height = this.field.height;  
        this.ctx = this.canvas.getContext('2d');  
        this.svgElement.appendChild(this.image);
        this.svgElement.style.imageRendering = "pixelated";
        document.getElementById('svg-box').style.backgroundColor = App.rgbToHex(this.field.statesColors[0]);
        this.drawField();
        this.setViewBox();
        this.addEventListeners();
    }

    setViewBox() {
        this.svgElement.setAttribute("viewBox", `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.width} ${this.viewBox.height}`);
    }

    addEventListeners() {
        let isMouseDown = false;
        const beforeMoving = {
            mouse: { x: 0, y: 0 },
            viewBox: { x: 0, y: 0 }
        }
        this.svgElement.addEventListener("wheel", e => {
            e.preventDefault();
            const wd = this.viewBox.width * (e.deltaY > 0 ? 0.25 : 0.2);
            const hd = this.viewBox.height * (e.deltaY > 0 ? 0.25 : 0.2);
            const newWidth = this.viewBox.width + (e.deltaY > 0 ? wd : -wd);
            const newHeight = this.viewBox.height + (e.deltaY > 0 ? hd : -hd);
            if (newWidth >= 1 && newHeight >= 1) {
                this.viewBox.width = newWidth;
                this.viewBox.height = newHeight;
                const elementRect = this.svgElement.getBoundingClientRect();
                let changeX = (e.deltaY > 0 ? -wd : wd) * ((e.clientX - elementRect.x) / elementRect.width);
                let changeY = (e.deltaY > 0 ? -hd : hd) * ((e.clientY - elementRect.y) / elementRect.height);
                this.viewBox.x +=  changeX;
                this.viewBox.y +=  changeY;
            }
            this.setViewBox();
        });

        this.svgElement.addEventListener("mousedown", e => {
            isMouseDown = true;
            beforeMoving.mouse.x = e.clientX;
            beforeMoving.mouse.y = e.clientY;
            beforeMoving.viewBox.x = this.viewBox.x;
            beforeMoving.viewBox.y = this.viewBox.y;
        });

        this.svgElement.addEventListener("mousemove", e => {
            if (isMouseDown) {
                const elementRect = this.svgElement.getBoundingClientRect();
                let changeX = (beforeMoving.mouse.x - e.clientX) / (elementRect.width / this.viewBox.width);
                let changeY = (beforeMoving.mouse.y - e.clientY) / (elementRect.height / this.viewBox.height);
                if (this.viewBox.width < this.viewBox.height) {
                    changeX *= this.viewBox.height / this.viewBox.width;
                }
                if (this.viewBox.height < this.viewBox.width) {
                    changeY *= this.viewBox.width / this.viewBox.height;
                }
                this.viewBox.x = beforeMoving.viewBox.x +  changeX;
                this.viewBox.y = beforeMoving.viewBox.y +  changeY;
                this.setViewBox();
            }
        });

        document.addEventListener("mouseup", e => {
            isMouseDown = false;
        });
    }

    drawField() {
        const imageData = new ImageData(this.field.width, this.field.height);
        for (let i = 0; i < this.field.height; i++) {
            for (let j = 0; j < this.field.width; j++) {
                const state = this.field.statesMap[i][j];
                const index = (i * this.field.width + j) * 4;
                imageData.data[index] = this.field.statesColors[state][0];
                imageData.data[index + 1] = this.field.statesColors[state][1];
                imageData.data[index + 2] = this.field.statesColors[state][2];
                imageData.data[index + 3] = 255;
            }
        }
        this.ctx.putImageData(imageData, 0, 0);
        this.image.setAttribute("href", this.canvas.toDataURL());
    }
}

class App {
    constructor() {
        this.neighbourhoodApplied = false;
        this.fieldApplied = false;
        this.ruleApplied = false;
        this.running = false;
        this.field = new Field();
        this.cAutomaton = new CAutomaton(this.field);
        this.states = [[255, 255, 255], [0, 0, 0]];
        this.nMap = [];
        this.nSize = 3;
        this.svg;
        this.cAutomaton;
        this.timer;
        this.addEventListeners();
    }

    step() {
        this.cAutomaton.step();
        this.svg.drawField();
        this.updateInfo();
    }

    loadField(map) {
        this.field.width = Number(document.getElementById('width').value);
        this.field.height = Number(document.getElementById('height').value);
        this.field.clearStates();
        this.states.forEach(state => this.field.addState(state));
        this.field.setMap(map);
        this.fieldApplied = true;
        this.svg = new SVG(this.field);
        this.svg.createSvgElement();
    }

    printStates() {
        const el = document.getElementById('states-list');
        el.textContent = "";
        for (let i = 0; i < this.states.length; i++) {
            el.innerHTML += `<p>${i}: <input type="color" value="${App.rgbToHex(this.states[i])}" class="color-picker" data-for="${i}"> <span class="link remove-state" data-for="${i}">Удалить</span>`;
        }
        document.querySelectorAll('.remove-state').forEach(el => el.addEventListener('click', e => {
            this.states.splice(Number(el.dataset.for), 1);
            this.printStates();
        }));
        document.querySelectorAll('.color-picker').forEach(el => el.addEventListener('change', e => {
            this.states[Number(el.dataset.for)] = App.hexToRgb(el.value);
        }));
    }

    showFunctionsList() {
        document.getElementById('functions-list').textContent = "";
        for (const name of Object.keys(maps)) {
            document.getElementById('functions-list').innerHTML += `<option value="${name}">${name}</option>`;
        }
    }

    showRulesList() {
        document.getElementById('rules-list').textContent = "";
        for (const name of Object.keys(rules[this.field.dimension])) {
            document.getElementById('rules-list').innerHTML += `<option value="${name}">${name}</option>`;
        }
    }

    showNeighbourhoodTable() {
        const rect = App.getRectInfo(this.nSize, this.field.dimension);
        const table = document.getElementById('neighbourhood-table');
        table.textContent = "";
        for (let i = 0; i < rect.height; i++) {
            const tr = document.createElement('tr');
            for (let j = 0; j < rect.width; j++) {
                const td = document.createElement('td');
                if (this.nMap[i][j] !== 0) {
                    td.classList.add('n-active');
                }
                if (i === rect.centerY && j === rect.centerX) {
                    td.classList.add('n-center');
                }
                td.dataset.x = j;
                td.dataset.y = i;
                tr.appendChild(td);
            }
            table.appendChild(tr);
        }
    }

    createNeighbourhoodMap() {
        const type = Number(document.getElementById('n-template').value);
        const rect = App.getRectInfo(this.nSize, this.field.dimension);
        this.nMap = [];
        for (let i = 0; i < rect.height; i++) {
            this.nMap[i] = [];
            for (let j = 0; j < rect.width; j++) {
                this.nMap[i][j] = (type === 0 || type === 1 && Math.abs(rect.centerY - i) + Math.abs(rect.centerX - j) <= rect.centerX) ? 1 : 0;
            }
        }
    }

    run(interval) {
        clearInterval(this.timer);
        this.running = true;
        this.timer = setInterval(() => this.step(), 1000 / interval);
    }

    stop() {
        clearInterval(this.timer);
        this.running = false;
        this.updateInfo();
    }

    save() {
        const obj = {
            dimension: this.field.dimension,
            imageSrc: this.fieldApplied ? this.svg.canvas.toDataURL() : "",
            statesColors: this.fieldApplied ? this.field.statesColors : [],
            map: this.neighbourhoodApplied ? this.cAutomaton.map : [],
            transitions: this.ruleApplied ? this.cAutomaton.transitions : [],
            borderType: this.cAutomaton.borderType
        };
        const el = document.createElement('a');
        el.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(obj)));
        el.setAttribute('download', 'Имя_автомата.json');
        el.style.display = 'none';
        document.body.appendChild(el);
        el.click();
        document.body.removeChild(el);
    }

    open(e) {
        const fileReader = new FileReader();
        if (e.target.files.length > 0) {
            fileReader.readAsText(e.target.files[0]);
            fileReader.addEventListener("loadend", () => {
                try {
                    const obj = JSON.parse(fileReader.result);
                    this.applyDimension(obj.dimension);
                    this.showTabContent('field');
                    this.showTabContent('neighbourhood');
                    if (obj.imageSrc !== "") {
                        this.loadImage(obj.imageSrc, obj.statesColors, () => {
                            this.svg.createSvgElement();
                            this.printStates();
                            if (obj.map.length !== 0) {
                                this.cAutomaton.setNeighbourhood(obj.map[0].length, obj.map);
                                this.neighbourhoodApplied = true;
                                this.showTabContent('rule');
                                if (obj.transitions.length !== 0) {
                                    this.cAutomaton.transitions = obj.transitions;
                                    this.cAutomaton.borderType = obj.borderType;
                                    this.ruleApplied = true;
                                }
                            }
                            this.updateInfo();
                        });
                    } else {
                        this.updateInfo();
                    }
                } catch (e) {
                    alert("Ошибка загрузки файла: " + e);
                }
            });
        }
    }

    loadImage(src, statesColors = [], callback = () => {}) {
        const image = new Image();
        image.addEventListener('load', () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0);
            const imageData = ctx.getImageData(0, 0, image.width, image.height).data;
            const imageArray = [];
            const states = {};
            this.states = [];
            statesColors.forEach((color, index) => {
                states[color] = index;
                this.states.push(color);
            });
            let statesCounter = 0;
            for (let i = 0; i < image.height; i++) {
                imageArray[i] = [];
                for (let j = 0; j < image.width; j++) {
                    const index = (i * image.width + j) * 4;
                    const color = [imageData[index], imageData[index + 1], imageData[index + 2]];
                    if (states[color] === undefined) {
                        states[color] = statesCounter++;
                        this.states.push(color);
                    }
                    imageArray[i][j] = states[color];
                }
            }
            if (this.states.length < 20) {
                this.printStates();
                this.showMessage('msg-image', 'Изображение загружено');
                setTimeout(() => this.showMessage('msg-image', ''), 1500);
                document.getElementById('width').value = image.width;
                document.getElementById('height').value = image.height;
                this.loadField((i, j) => imageArray[i][j]);
                callback();
            } else {
                this.showMessage('msg-image', 'Состояний должно быть меньше 20');
            }
        });
        image.src = src;
        return image;
    }

    openImage(e) {
        const fileReader = new FileReader();
        fileReader.readAsDataURL(e.target.files[0]);
        fileReader.addEventListener("loadend", () => this.loadImage(fileReader.result));
    }

    showMessage(id, message) {
        document.getElementById(id).textContent = message;
    }

    openTab(id) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
        document.querySelector('.tab-active').classList.remove('tab-active');
        document.getElementById('tab-' + id).classList.add('tab-active');
    }

    showTabContent(id) {
        if (id === 'field') {
            this.printStates();
            this.showFunctionsList();
        } else if (id === 'neighbourhood') {
            this.createNeighbourhoodMap();
            this.showNeighbourhoodTable();
        } else if (id === 'rule') {
            this.constructorNeighbourhood = new Array(this.cAutomaton.neighbourhoodAreaSize**(this.field.dimension + 1)).fill(0);
            document.getElementById('max-transition-number').textContent = this.cAutomaton.maxTransitionNumber;
            const tnElement = document.getElementById('transition-number')
            tnElement.setAttribute("max", this.cAutomaton.maxTransitionNumber);
            tnElement.value = 0;
            this.showConstructor();
            this.showRulesList();
            if (this.field.dimension === DIMENSION.ONE_D) {
                document.getElementById('max-wolfram-code').textContent = this.cAutomaton.maxWolframCode;
                const wcElement = document.getElementById('wolfram-code')
                wcElement.setAttribute("max", this.cAutomaton.maxWolframCode);
                wcElement.value = 0;
            }
            this.ruleApplied = false;
        }
        document.getElementById(`${id}-content`).classList.remove("hidden");
        document.getElementById(`${id}-msg`).classList.add("hidden");
    }

    hideTabContent(id) {
        document.getElementById(`${id}-content`).classList.add("hidden");
        document.getElementById(`${id}-msg`).classList.remove("hidden");
    }

    showConstructor() {
        const rect = App.getRectInfo(this.cAutomaton.neighbourhoodAreaSize, this.field.dimension);
        const table = document.getElementById('constructor-table');
        table.textContent = "";
        for (let i = 0; i < rect.height; i++) {
            const shiftedI = i - rect.centerY;

            const tr = document.createElement('tr');
            for (let j = 0; j < rect.width; j++) {
                const shiftedJ = j - rect.centerX;
                const td = document.createElement('td');
                const cellNumber = this.cAutomaton.neighbourhoodMap[shiftedI][shiftedJ];
                if (cellNumber === -1) {
                    td.classList.add('n-disabled');
                }
                if (i === rect.centerY && j === rect.centerX) {
                    td.classList.add('n-center');
                }
                td.dataset.x = shiftedJ;
                td.dataset.y = shiftedI;
                if (cellNumber !== -1) {
                    td.style.backgroundColor = App.rgbToHex(this.field.statesColors[this.constructorNeighbourhood[cellNumber]]);
                }
                tr.appendChild(td);
            }
            table.appendChild(tr);
        }
        document.getElementById('constructor-transition').style.backgroundColor = App.rgbToHex(this.field.statesColors[this.cAutomaton.getTransition(App.nArrayToNumber(this.constructorNeighbourhood, this.field.numberOfStates))]);
    }

    switchSpoiler(id) {
        const el = document.getElementById(id);
        if (el.style.display === "block") {
            el.style.display = "none";
        } else {
            el.style.display = "block";
        }
    }

    applyDimension(dimension) {
        this.fieldApplied = false;
        this.neighbourhoodApplied = false;
        this.field.dimension = dimension;
        const woElement = document.getElementById('wolfram-opt');
        if (this.field.dimension) {
            woElement.disabled = true;
        } else {
            woElement.disabled = false;
        }
    }

    applyField() {
        try {
            this.loadField(eval(document.getElementById('field-function').value));
            return true;
        } catch (e) {
            alert("Ошибка: " + e);
            return false;
        }
    }

    applyRule() {
        this.showConstructor();
        this.ruleApplied = true;
        this.updateInfo();
    }

    showBox(number, boxes) {
        boxes.forEach(box => document.getElementById(box).style.display = "none");
        document.getElementById(boxes[number]).style.display = "block";
    }

    updateInfo() {
        document.getElementById('dimension-info').textContent = this.field.dimension === DIMENSION.ONE_D ? "одномерный" : "двумерный";
        if (this.fieldApplied) {
            document.getElementById('field-applied-info').textContent = "загружено";
            document.getElementById('width-info').textContent = this.field.width;
            document.getElementById('height-info').textContent = this.field.height;
            document.getElementById('number-of-states-info').textContent = this.field.numberOfStates;
        }
        if (this.neighbourhoodApplied) {
            document.getElementById('neighbourhood-applied-info').textContent = "загружена";
            document.getElementById('neighbourhood-length-info').textContent = this.cAutomaton.neighbourhoodLength;
        }
        if (this.fieldApplied && this.neighbourhoodApplied) {
            document.getElementById('border-type-info').textContent = this.cAutomaton.borderType === BORDER_TYPE.BLANK ? "как плоскость" : "как тор";
            document.getElementById('generation-info').textContent = this.field.generation;
            if (this.ruleApplied) {
                document.getElementById('rule-applied-info').textContent = "заданы";
                document.getElementById('step').disabled = false;
                document.getElementById('run').disabled = this.running;
                document.getElementById('stop').disabled = !this.running;
            } else {
                document.getElementById('rule-applied-info').textContent = "не заданы";
                document.getElementById('step').disabled = true;
                document.getElementById('run').disabled = true;
            }
        }
    }

    addEventListeners() {
        document.getElementById('save').addEventListener('click', () => this.save());
        document.getElementById('open').addEventListener('click', () => document.getElementById('open-file').click());
        document.getElementById('open-file').addEventListener('change', e => this.open(e));
        document.getElementById('open-image').addEventListener('click', () => document.getElementById('open-image-file').click());
        document.getElementById('open-image-file').addEventListener('change', e => this.openImage(e));
        document.getElementById('step').addEventListener('click', () => this.step());
        document.getElementById('run').addEventListener('click', () => this.run(document.getElementById("sps").value));
        document.getElementById('stop').addEventListener('click', () => this.stop());
        document.getElementById('sps').addEventListener('change', () => {
            if (this.ruleApplied) {
                if (document.getElementById('run').disabled) {
                    this.stop();
                    this.run(document.getElementById("sps").value);
                }
            }
        });
        document.querySelector('.tabs').addEventListener('click', e => {
            const id = e.target.dataset.for;
            if (id) this.openTab(id);
        });
        document.querySelector('.spoiler-header').addEventListener('click', e => {
            const id = e.target.dataset.for;
            if (id) this.switchSpoiler(id);
        });
        document.getElementById('help').addEventListener('click', e => {
            const el = document.querySelector('.popup');
            el.style.visibility = 'visible';
            el.style.opacity = '1';
        });
        document.getElementById('close-help').addEventListener('click', e => {
            const el = document.querySelector('.popup');
            el.style.opacity = '0';
            el.style.visibility = 'hidden';
        });
        document.getElementById('add-state').addEventListener('click', e => {
            this.states.push([0, 0, 0]);
            this.printStates();
        });
        document.getElementById('load-function').addEventListener('click', e => {
            document.getElementById('field-function').value = maps[document.getElementById('functions-list').value];
        });
        document.getElementById('load-rule').addEventListener('click', e => {
            document.getElementById('rule-function').value = rules[this.field.dimension][document.getElementById('rules-list').value];
        });
        document.getElementById('fill-type').addEventListener('change', e => {
            const type = Number(e.target.value);
            this.showBox(type, ['load-image-box', 'load-function-box']);
        });
        document.getElementById('set-type').addEventListener('change', e => {
            const type = Number(e.target.value);
            this.showBox(type, ['constructor-box', 'load-rule-box', 'wolfram-code-box']);

            if (type === 0) {
                this.showConstructor();
            } else if (type === 2) {
                document.getElementById('wolfram-code').value = App.nArrayToNumber(this.cAutomaton.transitions, this.field.numberOfStates);
            }
        });
        document.getElementById('neighbourhood-table').addEventListener('click', e => {
            const td = e.target;
            if (td.tagName !== "TD") {
                return;
            }
            td.classList.toggle('n-active');
            this.nMap[td.dataset.y][td.dataset.x] = td.classList.contains('n-active') ? 1 : 0;
        });
        document.getElementById('constructor-table').addEventListener('click', e => {
            const td = e.target;
            if (td.tagName !== "TD" || td.classList.contains('n-disabled')) {
                return;
            }
            const x = td.dataset.x;
            const y = td.dataset.y;
            const cellNumber = this.cAutomaton.neighbourhoodMap[y][x];
            let state = this.constructorNeighbourhood[cellNumber] + 1;
            state %= this.field.numberOfStates;
            this.constructorNeighbourhood[cellNumber] = state;
            td.style.backgroundColor = App.rgbToHex(this.field.statesColors[state]);
            const transitionNumber = App.nArrayToNumber(this.constructorNeighbourhood, this.field.numberOfStates);
            document.getElementById('constructor-transition').style.backgroundColor = App.rgbToHex(this.field.statesColors[this.cAutomaton.getTransition(transitionNumber)]);
            document.getElementById('transition-number').value = transitionNumber;
        });
        document.getElementById('constructor-transition').addEventListener('click', e => {
            const td = e.target;
            const transitionNumber = App.nArrayToNumber(this.constructorNeighbourhood, this.field.numberOfStates);
            let state = this.cAutomaton.getTransition(transitionNumber) + 1;
            state %= this.field.numberOfStates;
            this.cAutomaton.transitions[transitionNumber] = state;
            td.style.backgroundColor = App.rgbToHex(this.field.statesColors[state]);
            this.ruleApplied = true;
            this.updateInfo();
        });
        document.getElementById('inc-neighbourhood-table').addEventListener('click', e => {
            this.nSize += 2;
            if (this.nSize === 7) {
                this.nSize = 5;
            }
            this.createNeighbourhoodMap();
            this.showNeighbourhoodTable();
        });
        document.getElementById('dec-neighbourhood-table').addEventListener('click', e => {
            this.nSize -= 2;
            if (this.nSize === 1) {
                this.nSize = 3;
            }
            this.createNeighbourhoodMap();
            this.showNeighbourhoodTable();
        });
        document.getElementById('n-template').addEventListener('change', e => {
            this.createNeighbourhoodMap();
            this.showNeighbourhoodTable();
        });
        document.getElementById('set-border').addEventListener('change', e => {
            this.cAutomaton.borderType = Number(document.getElementById('set-border').value);
            this.updateInfo();
        });
        document.getElementById('dim-apply').addEventListener('click', () => {
            this.applyDimension(Number(document.getElementById('dimension').value))
            this.hideTabContent('rule');
            this.showTabContent('field');
            this.showTabContent('neighbourhood');
            this.openTab('field');
            this.updateInfo();
        });
        document.getElementById('field-apply').addEventListener('click', () => {
            if (this.applyField()) {
                if (this.neighbourhoodApplied) {
                    this.showTabContent('rule');
                    this.openTab('rule');
                } else {
                    this.openTab('neighbourhood');
                }
            }

            this.updateInfo();
        });
        document.getElementById('n-apply').addEventListener('click', e => {
            this.cAutomaton.setNeighbourhood(this.nSize, this.nMap);
            this.neighbourhoodApplied = true;
            if (this.fieldApplied) {
                this.showTabContent('rule');
                this.openTab('rule');
            } else {
                this.openTab('field');
            }
            
            this.updateInfo();
        });
        document.getElementById('rule-apply').addEventListener('click', e => {
            try {
                this.cAutomaton.applyTransitionsRule(eval(document.getElementById('rule-function').value));
                this.applyRule();
                this.showMessage('msg-rule', 'Функция применена');
                setTimeout(() => this.showMessage('msg-rule', ''), 1500);
            } catch (e) {
                alert("Ошибка: " + e);
            }
        });
        document.getElementById('transition-number').addEventListener('change', e => {
            const number = Number(e.target.value);
            if (number >= 0 && number <= this.cAutomaton.maxTransitionNumber) {
                this.constructorNeighbourhood = App.nNumberToArray(number, this.field.numberOfStates, this.cAutomaton.neighbourhoodLength);
            } else {
                e.target.value = App.nArrayToNumber(this.constructorNeighbourhood, this.field.numberOfStates);
            }

            this.showConstructor();
        });
        document.getElementById('wolfram-code').addEventListener('change', e => {
            const number = Number(e.target.value);
            if (number < 0 || number > this.cAutomaton.maxWolframCode) {
                e.target.value = 0;
            }
        });
        document.getElementById('wolfram-apply').addEventListener('click', e => {
            const number = document.getElementById('wolfram-code').value;
            this.cAutomaton.transitions = App.nNumberToArray(number, 2, this.cAutomaton.field.numberOfStates**this.cAutomaton.neighbourhoodLength);
            this.applyRule();
        });
    }

    static hexToRgb(hex) {
        return hex.match(/[A-Za-z0-9]{2}/g).map(h => parseInt(h, 16));
    }

    static rgbToHex(rgb) {
        return '#' + rgb.map(r => r.toString(16).padStart(2, '0')).join('');
    }

    static nArrayToNumber(neighbourhood, numberOfStates) {
        let number = 0;
        for (let i = 0; i < neighbourhood.length; i++) {
            number += neighbourhood[i] * numberOfStates**i;
        }
        return number;
    }

    static nNumberToArray(neighbourhood, numberOfStates, neighbourhoodLength) {
        let array = [];
        for (let i = 0; i < neighbourhoodLength; i++) {
            array.push(neighbourhood % numberOfStates);
            neighbourhood = Math.floor(neighbourhood / numberOfStates);
        }
        return array;
    }

    static getRectInfo(size, dimension) {
        const height = dimension === DIMENSION.ONE_D ? 1 : size;
        const width = size;
        return {
            height,
            width,
            centerX: (width - 1) / 2,
            centerY: (height - 1) / 2
        };
    }
}

const app = new App();