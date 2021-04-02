const SHIFT = {
        LEFT: 0,
        RIGHT: 1,
        NO: 2
    },
    MTYPE = {
        ONETAPE: 0,
        MULTITAPE: 1,
        MULTIHEAD: 2
    },
    STATUS = {
        RUNNING: 0,
        NO_TRANSITION: 1,
        TERMINATED: 2,
        TERMINATED_IN_FINAL_STATE: 3
    }

class Machine {
    constructor() {
        this.initialState;
        this.finalStates = [];
        this.currentState;
        this.tapes;
        this.numberOfTapes = 0;
        this.transitions = {};
        this.lastTransition = { state: "", symbols: [] };
        this.status = STATUS.TERMINATED;
        this.type = MTYPE.ONETAPE;
        this.statesGroups = [];
        this.history = [];
    }
    
    load(text) {
        const initialStateRegex = /\(IS: (\w+)\)/g;
        const initialStateMatch = initialStateRegex.exec(text);

        this.initialState = (initialStateMatch !== null) ? initialStateMatch[1] : "S0";

        const finalStatesRegex = /\(FS: (\w+(?:, \w+){0,})\)/g;
        const finalStatesMatch = finalStatesRegex.exec(text);

        this.finalStates = (finalStatesMatch !== null) ? [...finalStatesMatch[1].split(", ")] : [];

        const blankSymbolRegex = /\(BS: (.)\)/g;
        const blankSymbolMatch = blankSymbolRegex.exec(text);

        const emptySymbol = (blankSymbolMatch !== null) ? blankSymbolMatch[1] : '#';

        const initialTapeRegex = /\(T: (\w+)\)/g;
        const initialTapeMatch = initialTapeRegex.exec(text);

        const initialTapeSymbols = (initialTapeMatch !== null) ? initialTapeMatch[1] : "";

        const statesGroupsLineRegex = /\(SG: \(\w+(?:, \w+){0,}\)(?:, \(\w+(?:, \w+){0,}\)){0,}\)/g;
        const statesGroupsLineMatch = statesGroupsLineRegex.exec(text);

        if (statesGroupsLineMatch !== null) {
            const statesGroupsRegex = /\((\w+(?:, \w+){0,})\)/g;
            const statesGroupsMatches = statesGroupsLineMatch[0].matchAll(statesGroupsRegex);

            this.type = MTYPE.MULTIHEAD;

            this.statesGroups = [];
            for (const capture of statesGroupsMatches) {
                this.statesGroups.push(capture[1].split(", "));
            }
            
            this.numberOfTapes = 1;
        } else {
            this.type = MTYPE.MULTITAPE;
        } 

        this.transitions = {};

        const transitionsRegex = /\((\w+), (?:\((.(?:, .){0,})\)|(.))\) ?-> ?\((\w+), (?:\((.(?:, .){0,})\)|(.)), (?:\(([LlRrNn](?:, [LlRrNn]){0,})\)|([LlRrNn]))\)/g;
        const transitionsMatches = Array.from(text.matchAll(transitionsRegex));

        if (this.type === MTYPE.MULTITAPE) {
            if (transitionsMatches.length > 0) {
                this.numberOfTapes = (transitionsMatches[0][3] !== undefined) ? 1 : transitionsMatches[0][2].split(", ").length;
                if (this.numberOfTapes === 1) {
                    this.type = MTYPE.ONETAPE;
                }
            } else {
                this.numberOfTapes = 0;
            }
        }

        for (const match of transitionsMatches)
        {
            const stateLeft = match[1];
            const symbolsLeft = (match[3] !== undefined) ? match[3] : match[2].split(", ").join("");

            const stateRight = match[4];
            const symbolsRight = [];
            if (match[6] !== undefined) {
                symbolsRight.push(match[6]);
            } else {
                symbolsRight.push(...match[5].split(", "));
            }

            const directions = [];
            if (match[8] !== undefined) {
                directions.push(match[8].toLowerCase());
            } else {
                directions.push(...match[7].toLowerCase().split(", "));
            }

            const shifts = [];
            for (const direction of directions) {
                if (direction === 'r') {
                    shifts.push(SHIFT.RIGHT);
                } else if (direction === 'l') {
                    shifts.push(SHIFT.LEFT);
                } else {
                    shifts.push(SHIFT.NO);
                }
            }

            if (symbolsLeft.length === this.numberOfTapes && symbolsRight.length === this.numberOfTapes && directions.length === this.numberOfTapes) {
                this.transitions[[stateLeft, symbolsLeft]] = {
                    state: stateRight,
                    symbols: symbolsRight,
                    shifts
                };
            }
        }
        
        this.tapes = [];
        for (let i = 0; i < this.numberOfTapes; i++)
        {
            if (this.type === MTYPE.MULTIHEAD) {
                this.tapes.push(new Tape(this.statesGroups.length, emptySymbol, initialTapeSymbols));
            } else if (i == 0) {
                this.tapes.push(new Tape(1, emptySymbol, initialTapeSymbols));
            } else {
                this.tapes.push(new Tape(1, emptySymbol));
            }
        }
    }
    
    step() {
        if (this.status === STATUS.RUNNING) {
            let head = 0;
            if (this.type === MTYPE.MULTIHEAD) {
                for (let j = 0; j < this.statesGroups.length; j++) {
                    if (this.statesGroups[j].includes(this.currentState)) {
                        head = j;
                    }
                }
                this.tapes[0].activeHead = head;
            }

            const tapesSymbols = [];
            for (const tape of this.tapes) {
                tapesSymbols.push(tape.currentSymbol);
            }

            let transition;
            if ((transition = this.transitions[[this.currentState, tapesSymbols.join("")]]) !== undefined) {
                this.lastTransition.state = this.currentState;
                this.lastTransition.symbols = tapesSymbols;
                this.history.push([]);
                for (let i = 0; i < this.numberOfTapes; i++) {
                    let record = this.tapes[i].tape.join("");
                    record = record.substring(0, this.tapes[i].offset) + "<strong>" + record.substring(this.tapes[i].offset, this.tapes[i].offset + 1) + "</strong>" + record.substring(this.tapes[i].offset + 1);
                    this.history[this.history.length - 1].push(record);
                    this.tapes[i].move(head, transition.symbols[i], transition.shifts[i]);
                }
                this.currentState = transition.state;
            } else {
                this.lastTransition = {};
                this.status = STATUS.NO_TRANSITION;
            }
            if (this.finalStates.includes(this.currentState)) {
                this.status = STATUS.TERMINATED_IN_FINAL_STATE;
            }
        }
    }
    
    resetState() {
        this.status = STATUS.RUNNING;
        this.currentState = this.initialState;
    }

    getTape(number) {
        return this.tapes[number];
    }
}

class Tape {
    static initialLength = 16;

    constructor(numberOfHeads, emptySymbol = "#", strTape = "") {
        this.blankSymbol = emptySymbol;
        this.tape = [...strTape];
        this.activeHead = 0;
        this.positions = [];
        this.offset = 0;
        this.numberOfHeads = numberOfHeads;

        for (let i = this.tape.length; i < Tape.initialLength; i++) {
            this.tape.push(this.blankSymbol);
        }

        for (let i = 0; i < this.numberOfHeads; i++) {
            this.positions.push(0);
        }
    }

    get position() {
        return this.positions[this.activeHead];
    }

    set position(value) {
        this.positions[this.activeHead] = value;
    }

    get currentSymbol() {
        return this.tape[this.positions[this.activeHead]];
    }

    set currentSymbol(value) {
        this.tape[this.positions[this.activeHead]] = value;
    }

    get top() {
        return this.tape.length - 1 - this.offset;
    }

    get bottom() {
        return -this.offset;
    }

    clear()
    {
        this.tape = [];
        for (let i = 0; i < Tape.initialLength; i++) {
            this.tape.push(this.blankSymbol);
        }

        for (let i = 0; i < this.numberOfHeads; i++) {
            this.positions[i] = 0;
        }

        this.offset = 0;
    }

    move(head, symbol, shift)
    {
        this.currentSymbol = symbol;
        this.activeHead = head;
        if (shift === SHIFT.LEFT) {
            if (this.position === 0) {
                this.tape.unshift(this.blankSymbol);
                this.offset++;
            } else {
                this.position--;
            }
        } else if (shift === SHIFT.RIGHT) {
            if (this.position === this.tape.length - 1) {
                this.increase();
            }
            this.position++;
        }
    }
    

    getPosition(head)
    {
        if (head < this.numberOfHeads) {
            return this.positions[head];
        }
        return 0;
    }

    increase()
    {
        this.tape.push(this.blankSymbol);
    }

    getSymbol(pos)
    {
        if (pos >= this.bottom && pos <= this.top) {
            return this.tape[pos + this.offset];
        }
        return this.blankSymbol;
    }

    setSymbol(pos, symbol)
    {
        this.tape[this.offset + pos] = symbol;
    }
}

class TapePanel {
    constructor(tape, disabled = false) {
        this.tape = tape;
        this.startSymbol = 0;
        this.colors = ["cornflowerblue", "hotpink", "lightskyblue", "orchid", "deepskyblue"];

        this.savedCellSymbol = this.tape.blankSymbol;

        this.parent = document.createElement("div");
        this.parent.classList.add("tape-panel")

        this.labels = [];
        this.cells = [];

        const lbSpan = document.createElement("span");
        lbSpan.classList.add("tape-panel-button");
        this.moveLeftButton = document.createElement("button");
        this.moveLeftButton.textContent = "←";
        this.moveLeftButton.classList.add("button");

        this.parent.appendChild(lbSpan);
        lbSpan.appendChild(this.moveLeftButton);

        for (let i = 0; i < Tape.initialLength; i++) {
            const span = document.createElement("span");
            this.labels.push(document.createElement("p"));
            const p = document.createElement("p");
            this.cells.push(document.createElement("input"));
            this.cells[i].setAttribute("type", "text");
            this.cells[i].setAttribute("maxlength", "1");
            this.cells[i].setAttribute("id", `cell${i}`);
            this.cells[i].setAttribute("data-index", i);
            if (disabled) this.cells[i].disabled = true;

            this.parent.appendChild(span);
            span.appendChild(this.labels[i]);
            span.appendChild(p);
            p.appendChild(this.cells[i]);
        }

        const rbSpan = document.createElement("span");
        rbSpan.classList.add("tape-panel-button");
        this.moveRightButton = document.createElement("button");
        this.moveRightButton.textContent = "→";
        this.moveRightButton.classList.add("button");

        this.parent.appendChild(rbSpan);
        rbSpan.appendChild(this.moveRightButton);

        this.addEventListeners();
    }

    moveLeft() {
        this.readTape();
        if (this.startSymbol > this.tape.bottom) {
            this.startSymbol--;
        }
        this.update();
    }

    moveRight() {
        this.readTape();
        if (this.startSymbol + Tape.initialLength - 1 === this.tape.top) {
            this.tape.increase();
        }
        this.startSymbol++;
        this.update();
    }

    readTape() {
        for (let i = 0; i < Tape.initialLength; i++) {
            this.tape.setSymbol(i + this.startSymbol, (this.cells[i].value !== "") ? this.cells[i].value : this.savedCellSymbol);
        }
    }

    update() {
        for (let i = 0; i < Tape.initialLength; i++) {
            this.cells[i].style.backgroundColor = "white";
            this.cells[i].value = this.tape.getSymbol(i + this.startSymbol);
            this.labels[i].textContent = i + this.startSymbol;
        }

        for (let i = 0; i < this.tape.numberOfHeads; i++)
        {
            const index = this.tape.getPosition(i) - this.tape.offset - this.startSymbol;
            if (index >= 0 && index < Tape.initialLength) {
                this.cells[index].style.backgroundColor = this.colors[i % this.colors.length];
            }
        }

        if (this.startSymbol === this.tape.bottom) {
            this.moveLeftButton.disabled = true;
        } else {
            this.moveLeftButton.disabled = false;
        }
    }

    getElement() {
        return this.parent;
    }

    addEventListeners() {
        this.moveLeftButton.addEventListener("click", () => this.moveLeft());
        this.moveRightButton.addEventListener("click", () => this.moveRight());
        for (let i = 0; i < Tape.initialLength; i++) {
            this.cells[i].addEventListener("focus", event => this.cellOnFocus(event));
            this.cells[i].addEventListener("blur", event => this.cellOnBlur(event));
            this.cells[i].addEventListener("keyup", event => this.cellOnKeyup(event));
        }
    }

    cellOnFocus(event) {
        const cell = event.target;
        this.savedCellSymbol = (cell.value.length === 1) ? cell.value : this.tape.blankSymbol;
        cell.value = "";
    }

    cellOnBlur(event) {
        const cell = event.target;
        if (cell.value === "") cell.value = this.savedCellSymbol;
    }

    cellOnKeyup(event) {
        const cell = event.target;
        let direction = 1;
        if (event.code === "Backspace") {
            direction = -1;
            cell.value = this.tape.blankSymbol;
        } else if (event.code === "ArrowLeft") {
            direction = -1;
            cell.value = this.savedCellSymbol;
        } else if (event.code === "ArrowRight") {
            direction = 1;
            cell.value = this.savedCellSymbol;
        }

        if (cell.value !== "") {
            const index = parseInt(cell.dataset.index);
            if (direction === -1) {
                const nextToFocus = document.getElementById(`cell${index - 1}`);
                if (nextToFocus !== null) {
                    nextToFocus.focus();
                } else {
                    this.moveLeft();
                    cell.value = "";
                }
            } else {
                const nextToFocus = document.getElementById(`cell${index + 1}`);
                if (nextToFocus !== null) {
                    nextToFocus.focus();
                } else {
                    this.moveRight();
                    cell.value = "";
                }
            }
        }
    }
}

class App {
    constructor() {
        this.machine = new Machine();
        this.tapePanels;
        this.timer;
        this.addEventListeners();
    }

    initializeTapes() {
        this.tapePanels = [];
        const tapesPanel = document.getElementById("tapes-panel");
        tapesPanel.innerHTML = "";
        for (let i = 0; i < this.machine.numberOfTapes; i++) {
            this.tapePanels.push(new TapePanel(this.machine.getTape(i), i !== 0));
            tapesPanel.appendChild(this.tapePanels[i].getElement());
            this.tapePanels[i].update();
        }
    }

    updateTapes() {
        for (let i = 0; i < this.machine.numberOfTapes; i++) {
            this.tapePanels[i].update();
        }
    }

    clearTapes() {
        for (let i = 0; i < this.machine.numberOfTapes; i++) {
            this.machine.getTape(i).clear();
        }
        this.updateTapes();
    }

    step() {
        if (this.machine.status !== STATUS.RUNNING) {
            this.stop();
            return;
        }

        if (this.machine.numberOfTapes > 0)
        {
            this.tapePanels[0].readTape();

            this.machine.step();
            for (let i = 0; i < this.machine.numberOfTapes; i++) {
                const tapePosition = this.machine.tapes[i].position - this.machine.tapes[i].offset;
                const tapePanelPosition = this.tapePanels[i].startSymbol;
                if (tapePosition + 1 >= tapePanelPosition + Tape.initialLength) {
                    this.tapePanels[i].moveRight();
                } else if (tapePosition <= tapePanelPosition) {
                    this.tapePanels[i].moveLeft();
                }
            }
            this.updateTapes();
        }

        this.updateInfo();
    }
    
    load() {
        this.machine = new Machine();
        this.machine.load(document.getElementById("program-text").value);
        this.initializeTapes();
        this.machine.resetState();

        const join = array => {
            let str = array.join(', ');
            if (array.length > 1) str = `(${str})`;
            return str;
        };

        const transitionsEl = document.getElementById('transitions');
        transitionsEl.innerHTML = '';
        const initial = this.machine.initialState;
        transitionsEl.innerHTML += `<p>Начальное состояние: ${initial}</p>`;
        const finals = this.machine.finalStates;
        if (finals.length > 0) transitionsEl.innerHTML += `<p>Конечные состояния: ${join(finals)}</p>`;
        const shiftNames = ["L", "R", "N"];
        for (let [left, right] of Object.entries(this.machine.transitions)) {
            const stateLeft = left.split(",")[0];
            let symbolsLeft = left.substring(stateLeft.length + 1).split("");
            symbolsLeft = symbolsLeft.map(symbol => symbol.replace(/"/g, '&quot;'));
            let symbolsRight = right.symbols;
            symbolsRight = symbolsRight.map(symbol => symbol.replace(/"/g, '&quot;'));
            let shifts = right.shifts.map(shift => shiftNames[shift]);
            document.getElementById('transitions').innerHTML += `<p id="tr-${stateLeft}-${symbolsLeft.join("")}">(${stateLeft}, ${join(symbolsLeft)}) -> (${right.state}, ${join(symbolsRight)}, ${join(shifts)})</p>`;
        }
        this.openTab('transitions');
        this.updateInfo();
    }
    
    save() {
        const text = document.getElementById('program-text').value;
        const el = document.createElement('a');
        el.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        el.setAttribute('download', 'Имя_автомата.turm');
        el.style.display = 'none';
        document.body.appendChild(el);
        el.click();
        document.body.removeChild(el);
    }
    
    open(e) {
        const fileReader = new FileReader();
        fileReader.readAsText(e.target.files[0]);
        fileReader.addEventListener("loadend", () => {
            const text = fileReader.result;
            document.getElementById('program-text').value = text;
        });
        this.openTab('input');
    }
    
    run(interval) {
        clearInterval(this.timer);
        this.timer = setInterval(() => this.step(), 1000 / interval);
        document.getElementById("run").disabled = true;
        document.getElementById("stop").disabled = false;
    }

    stop() {
        clearInterval(this.timer);
        document.getElementById("run").disabled = false;
        document.getElementById("stop").disabled = true;
    }
    
    openTab(id) {
        document.querySelectorAll('.tab-content').forEach((el) => {
            el.classList.add('hidden');
        });
        document.getElementById(id).classList.remove('hidden');
        document.querySelector('.tab-active').classList.remove('tab-active');
        document.getElementById('tab-' + id).classList.add('tab-active');
    }
    
    updateInfo() {
        document.getElementById('number-of-tapes').textContent = this.machine.tapes.length;
        document.getElementById('number-of-heads').textContent = (this.machine.tapes.length > 0) ? this.machine.tapes[0].numberOfHeads : 0;
        document.getElementById('history').innerHTML = '';
        const history = this.machine.history;
        for (let i = history.length - 1; i >= 0; i--)  {
            for (let j = 0; j < history[i].length; j++) {
                document.getElementById('history').innerHTML += `<p>${j + 1}: ${history[i][j]}</p>`;
            }
        };
        const statuses = ['Активен', 'Переход не задан', '', 'Завершен в конечном состоянии'];
        const colors = ['blue', 'red', '', 'green'];
        document.getElementById('status').textContent = statuses[this.machine.status];
        document.getElementById('status').style.color = colors[this.machine.status];
        document.getElementById('current-state').textContent = this.machine.currentState;
        const mTypes = ['Одноленточная', 'Многоленточная', 'Многоголовочная'];
        document.getElementById('machine-type').textContent = mTypes[this.machine.type];
        let lastTransitionEl = document.querySelector('.last-transition');
        if (lastTransitionEl) lastTransitionEl.classList.remove('last-transition');
        const lastTransition = this.machine.lastTransition;
        lastTransition.symbols = lastTransition.symbols.map(symbol => symbol.replace(/"/g, '&quot;'));
        lastTransitionEl = document.getElementById(`tr-${lastTransition.state}-${lastTransition.symbols.join("")}`);
        if (lastTransitionEl !== null) lastTransitionEl.classList.add('last-transition');
    }
    
    addEventListeners() {
        document.getElementById('load').addEventListener('click', () => this.load());
        document.getElementById('save').addEventListener('click', () => this.save());
        document.getElementById('open').addEventListener('click', () => document.getElementById('open-file').click());
        document.getElementById('open-file').addEventListener('change', (e) => this.open(e));
        document.getElementById('step').addEventListener('click', () => this.step());
        document.getElementById('run').addEventListener('click', () => this.run(document.getElementById("sps").value));
        document.getElementById('stop').addEventListener('click', () => this.stop());
        document.getElementById('clear-tapes').addEventListener('click', () => this.clearTapes());
        document.getElementById('reset-state').addEventListener('click', () => {
            this.machine.resetState();
            this.updateInfo();
        });
        document.querySelector('.tabs').addEventListener('click', (e) => {
            const id = e.target.dataset.for;
            if (id) this.openTab(id);
        });

        document.getElementById('help').addEventListener('click', () => {
            const el = document.querySelector('.popup');
            el.style.visibility = 'visible';
            el.style.opacity = '1';
        });
        
        document.getElementById('close-help').addEventListener('click', () => {
            const el = document.querySelector('.popup');
            el.style.opacity = '0';
            el.style.visibility = 'hidden';
        });

    }
}

const app = new App();