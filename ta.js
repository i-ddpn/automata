const TYPE = {
        DTFA: 0,
        NTFA: 1,
        NTFAE: 2
    },
    STATUS = {
        RUNNING: 0,
        NO_TRANSITION: 1,
        TERMINATED: 2,
        TERMINATED_IN_FINAL_STATE: 3
    },
    DIRECTION = {
        BOTTOM_UP: 0,
        TOP_DOWN: 1
    },
    SVG_MIN_WIDTH = 100,
    SVG_MIN_HEIGHT = 100,
    NODE_AREA_LENGTH = 30,
    NODE_RADIUS = 10,
    NODE_COLOR = 'lightpink',
    NODE_COLOR_PROCESSED = 'cornflowerblue',
    NODE_COLOR_FINAL = 'forestgreen',
    NODE_COLOR_TERMINAL = 'crimson';

class Tree {
    constructor(name) {
        this.name = name;
        this.state;
        this.id = '0';
        this.index = '0';
        this.children = [];
        this.parent = null;
        this.isProcessed = false;
        this.isTerminal = false;
        this.isFinal = false;
    }

    load(s, setAllProcessed = false) {
        if (setAllProcessed) this.isProcessed = true;
        const openBracketIndex = s.indexOf(App.configs.symbols.openBracket);
        if (openBracketIndex !== -1) {
            this.name = s.substring(0, openBracketIndex);
            let pCount = 0;
            let start = openBracketIndex + 1;
            for (let i = start; i < s.length; i++) {
                if (s[i] === App.configs.symbols.openBracket)
                    pCount++;
                if (s[i] === App.configs.symbols.closedBracket)
                    pCount--;
                if (pCount === 0 && s[i] === App.configs.symbols.separator || pCount === -1 && s[i] === App.configs.symbols.closedBracket) {
                    const tree = new Tree();
                    tree.parent = this;
                    tree.index = this.children.length.toString();
                    tree.id = `${this.id}-${tree.index}`;
                    tree.load(s.substring(start, i), setAllProcessed);
                    this.children.push(tree);
                    start = i + 1;
                }
            }
        } else this.name = s;
    }

    reAssignIds(previousId, position) {
        if (previousId === '') this.id = position;
        else this.id = `${previousId}-${position}`;
        this.index = position;
        this.children.forEach((child, index) => {
            child.reAssignIds(this.id, index);
        });
    }

    findNode(id) {
        if (this.id === id) return this;
        for (let i = 0; i < this.children.length; i++) {
            const node = this.children[i].findNode(id);
            if (node) return node;
        }
        return false;
    }

    applyRanking() {
        if (this.children.length > 2) {
            const node = new Tree(this.name);
            node.children = this.children.slice(1);
            this.children = [...this.children.slice(0, 1), node];
        }
        this.children.forEach((child) => {
            child.applyRanking();
        });
    }

    insert(root, isTopDown = true) {
        if (isTopDown) root.state = this.state;
        root.leaves.forEach((leaf) => {
            if (leaf.name.includes('{')) {
                const openBracketIndex = leaf.name.indexOf('{');
                const stateName = leaf.name.substring(0, openBracketIndex);
                const variableIndex = parseInt(leaf.name.substring(openBracketIndex + 1, leaf.name.length - 1));
                if (variableIndex && variableIndex <= this.children.length && variableIndex >= 1) {
                    const rootOfSubtree = this.children[variableIndex - 1].clone;
                    if (root !== leaf) {
                        leaf.parent.children[leaf.index] = rootOfSubtree;
                        rootOfSubtree.parent = leaf.parent;
                    } else {
                        this.parent.children[this.index] = rootOfSubtree;
                        rootOfSubtree.parent = this.parent;
                        rootOfSubtree.state = root.state;
                        root = rootOfSubtree;
                    }
                    if (stateName !== '') rootOfSubtree.state = stateName;
                    rootOfSubtree.isProcessed = true;
                }
            } else {
                if (isTopDown) {
                    leaf.isFinal = true;
                    leaf.isTerminal = true;
                }
            }
        });
        this.copyPropertiesFrom(root);
    }

    copyPropertiesFrom(node) {
        this.name = node.name;
        this.isProcessed = node.isProcessed;
        this.id = node.id;
        this.state = node.state;
        this.isTerminal = node.isTerminal;
        this.isFinal = node.isFinal;
        this.parent = node.parent;
        this.index = node.index;
        this.children = node.children;
    }

    get logName() {
        if (this.state !== undefined) return this.state;
        return this.name;
    }

    get asString() {
        return `${this.logName}(${this.children.map((value) => ((value.children.length === 0) ? value.logName : value.asString))})`;
    }

    get yield() {
        return this.leaves.map((value) => value.name).join(' ');
    }

    get leaves() {
        const leaves = [];
        if (this.children.length === 0)
            leaves.push(this);
        else this.children.forEach((child) => {
            if (child.isLeaf) leaves.push(child);
            else leaves.push(...child.leaves);
        });
        return leaves;
    }

    get isLeaf() {
        return (this.children.length === 0) || (this.children.length === 1 && this.children[0].isTerminal);
    }

    get isUnprocessedLeaf() {
        return !this.isTerminal && this.children.reduce((total, current) => total && current.isProcessed, true);
    }

    get isProcessedLeaf() {
        return !this.isTerminal && this.children.reduce((total, current) => total && !current.isProcessed, true);
    }

    get leftmostLeaf() {
        if (this.isUnprocessedLeaf && !this.isProcessed) return this;
        for (let i = 0; i < this.children.length; i++) {
            const lml = this.children[i].leftmostLeaf;
            if (lml) return lml;
        }
        return false;
    }

    get leftmostProcessedLeaf() {
        if (this.isProcessedLeaf) return this;
        for (let i = 0; i < this.children.length; i++) {
            const lmpl = this.children[i].leftmostProcessedLeaf;
            if (lmpl) return lmpl;
        }
        return false;
    }

    get lastProcessedNode() {
        if (!this.isTerminal && this.isProcessed && (!this.children.reduce((total, current) => total && current.isProcessed, true) && this.children.length !== 0)) return this; 
        for (let i = 0; i < this.children.length; i++) {
            const lpn = this.children[i].lastProcessedNode;
            if (lpn) return lpn;
        }
        return false;
    }

    get areAllTerminalFinal() {
        if (this.isTerminal) {
            if (this.isFinal) return true;
            return false;
        } else {
            return this.children.reduce((total, current) => total && current.areAllTerminalFinal, true);
        }
    }

    get clone() {
        const clone = new Tree();
        clone.copyPropertiesFrom(this);
        clone.children = [];
        this.children.forEach((child) => {
            clone.children.push(child.clone);
        });
        return clone;
    }
}

class StatesList {
    constructor() {
        this.positions = {};
        this.names = [];
        this.finals = [];
        this.initial;
    }

    getPosition(name) {
        if (this.positions.hasOwnProperty(name))
            return this.positions[name];
        else return -1;
    }

    getName(position) {
        return this.names[position];
    }

    isFinal(name) {
        return this.finals.includes(name);
    }

    add(...names) {
        names.forEach((name) => {
            if (name.length > 0 && !this.names.includes(name)) {
                const index = this.names.length;
                this.names[index] = name;
                this.positions[name] = index;
            }
        });
    }

    namesArrayToString(names) {
        return names.map((name) => this.getPosition(name)).join('|');
    }

    positionsStringToArray(positions) {
        return positions.split('|').map((position) => this.getName(position));
    }
}

class TransitionsList {
    constructor() {
        this.transitions = {};
        this.nodeRanks = {};
        this.maxNondeterministic = 0;
    }

    add(nodeName, inStatesPositions, outStatesNames) {
        if (typeof(this.transitions[nodeName]) !== 'object')
            this.transitions[nodeName] = {};
        if (typeof(this.transitions[nodeName][inStatesPositions]) !== 'object')
            this.transitions[nodeName][inStatesPositions] = [];
        const transition = this.transitions[nodeName][inStatesPositions];
        transition.push(outStatesNames);
        if (transition.length > this.maxNondeterministic)
            this.maxNondeterministic = transition.length;
    }

    get(nodeName, inStatesPositions) {
        if (this.exists(nodeName, inStatesPositions))
            return this.transitions[nodeName][inStatesPositions]
        else return [];
    }

    exists(nodeName, inStatesPositions) {
        let result = this.transitions.hasOwnProperty(nodeName);
        if (arguments.length > 1 && result)
            result = result && this.transitions[nodeName].hasOwnProperty(inStatesPositions);
        return result;
    }
}

class Automaton {
    constructor(treeDefinition) {
        this.initialTree = new Tree();
        this.initialTree.load(treeDefinition)
        this.statesList = new StatesList();
        this.transitionsList = new TransitionsList();
        this.treeIndex;
        this.lastProcessedNodes;
        this.trees;
        this.history;
        this.status;
        this.lastTransition;
        this.type;
        this.direction;
        this.isTransducer;
    }

    addTransition(nodeName, inStatesNames, outStatesPositions) {
        const inStatesPositions = this.statesList.namesArrayToString(inStatesNames);
        this.transitionsList.add(nodeName, inStatesPositions, outStatesPositions);
    }

    load(s) {
        this.isTransducer = s.includes('[Transducer]');
        const transitions = [];
        let reTransitions;
        if (!this.isTransducer)
            reTransitions = /\((.+), (?:\((\w+(?:, \w+){0,})\)|(\w*))\) -> (?:(\w+)|\((\w+(?:, \w+){0,})\))/g;
        else reTransitions = /\((.+), (?:\((\w+(?:, \w+){0,})\)|(\w*))\) -> (.+)/g;
        let reTransitionsExec = reTransitions.exec(s);
        while (reTransitionsExec !== null) {
            const nodeName = reTransitionsExec[1];
            const inStatesNames = [];
            if (reTransitionsExec[2] !== undefined)
                inStatesNames.push(...reTransitionsExec[2].split(", "));
            else if (reTransitionsExec[3] !== undefined && reTransitionsExec[3] !== '')
                inStatesNames.push(reTransitionsExec[3]);
            const outStatesNames = [];
            if (reTransitionsExec[4] !== undefined)
                outStatesNames.push(reTransitionsExec[4]);
            else if (reTransitionsExec[5] !== undefined)
                outStatesNames.push(...reTransitionsExec[5].split(", "));
            transitions.push({
                nodeName: nodeName,
                inStatesNames: inStatesNames,
                outStatesNames: outStatesNames
            });
            this.statesList.add(...inStatesNames, ...outStatesNames);
            this.transitionsList.nodeRanks[nodeName] = inStatesNames.length;
            reTransitionsExec = reTransitions.exec(s);
        }
        transitions.forEach((transition) => this.addTransition(
            transition.nodeName,
            transition.inStatesNames,
            transition.outStatesNames
        ));
        if (!this.isTransducer && this.statesList.names.reduce((total, current) => total || this.transitionsList.transitions.hasOwnProperty(current), false)) {
            this.type = TYPE.NTFAE;
        } else if (this.transitionsList.maxNondeterministic > 1) this.type = TYPE.NTFA;
        else this.type = TYPE.DTFA;
        const reFinals = /^F: ([\w,\s]+)$/m.exec(s);
        if (reFinals !== null)
            this.statesList.finals = reFinals[1].split(', ');
        const reInitial = /^I: (\w+)/m.exec(s);
        if (reInitial !== null) {
            this.statesList.initial = reInitial[1];
            this.direction = DIRECTION.TOP_DOWN;
            this.initialTree.state = this.statesList.initial;
            this.initialTree.isProcessed = true;
        } else this.direction = DIRECTION.BOTTOM_UP;
        this.trees = [this.initialTree.clone];
        this.history = [[this.initialTree.asString]];
        this.status = [STATUS.RUNNING];
        this.lastTransition = [{nodeName: '', inStatesPositions: '', outStatesPositions: ''}];
        this.treeIndex = 0;
    }

    step() {
        this.lastProcessedNodes = [];
        let currentTree = this.trees[this.treeIndex];
        let currentIndex = this.treeIndex;
        let node = this.findNode(currentTree);
        if (node) {
            const nodeName = node.name;
            const inStatesPositions = this.statesList.namesArrayToString(
                (this.direction === DIRECTION.BOTTOM_UP) ? node.children.map((value) => value.state) : node.state.split('|')
            );
            if (this.transitionsList.exists(nodeName, inStatesPositions)) {
                const activeTransitions = this.transitionsList.get(nodeName, inStatesPositions);
                const saveTree = currentTree.clone;
                let parentNode = node;
                activeTransitions.forEach((outStatesNames, transitionIndex) => {
                    if (!this.isTransducer && this.direction === DIRECTION.TOP_DOWN && (parentNode.children.length !== outStatesNames.length && !(parentNode.children.length === 0 && outStatesNames.length === 1))) {
                        this.currentStatus = STATUS.NO_TRANSITION;
                    } else {
                        if (transitionIndex > 0) {
                            currentTree = saveTree.clone;
                            currentIndex = this.trees.push(currentTree) - 1;
                            this.status[currentIndex] = STATUS.RUNNING; 
                            node = this.findNode(currentTree);
                        }
                        parentNode = node;
                        const epsilonTrees = [];
                        outStatesNames.forEach((outStateName, outStateIndex) => {
                            if (this.direction === DIRECTION.TOP_DOWN) 
                                node = parentNode.children[outStateIndex];
                            const saveCurrentTree = currentTree.clone;
                            if (this.isTransducer) {
                                let tree = new Tree();
                                tree.load(outStateName, true);
                                if (this.direction === DIRECTION.BOTTOM_UP) {
                                    const stateName = tree.name;
                                    tree = tree.children[0];
                                    tree.state = stateName;
                                }
                                parentNode.insert(tree, this.direction === DIRECTION.TOP_DOWN);
                                this.currentTree.reAssignIds('', '0');
                            } else {
                                this.updateNode(node, outStateName, currentTree);
                            }
                            epsilonTrees.forEach((epsilonTree) => {
                                this.updateNode(epsilonTree.parentNode.children[outStateIndex], outStateName, epsilonTree.tree);
                            });
                            if (transitionIndex === 0)
                                this.lastProcessedNodes.push(node);
                            else {
                                this.history.push([...this.history[this.treeIndex], { type: 'N', index: this.treeIndex}, this.trees[currentIndex].asString]);
                            }
                            if (this.transitionsList.exists(outStateName)) {
                                this.transitionsList.get(outStateName, '').forEach((newState) => {
                                    newState = newState[0];
                                    const newTree = saveCurrentTree.clone;
                                    const newTreeIndex = this.trees.push(newTree) - 1;
                                    this.status[newTreeIndex] = STATUS.RUNNING;
                                    let newNode = this.findNode(newTree);
                                    epsilonTrees.push({
                                        tree: newTree,
                                        parentNode: newNode
                                    });
                                    if (this.direction === DIRECTION.TOP_DOWN) {
                                        newNode = newNode.children[outStateIndex];
                                    }
                                    this.updateNode(newNode, newState, newTree);
                                    this.history[newTreeIndex] = [...this.history[currentIndex]];
                                    if (transitionIndex === 0)
                                        this.history[newTreeIndex].push(this.trees[this.treeIndex].asString);
                                    this.history[newTreeIndex].push({ type: 'E', index: currentIndex }, this.trees[newTreeIndex].asString);
                                    this.lastTransition[newTreeIndex] = {
                                        nodeName: outStateName,
                                        inStatesPositions: '',
                                        outStatesPositions: this.statesList.namesArrayToString([newState])
                                    };
                                });
                            }
                        });
                        this.lastTransition[currentIndex] = {
                            nodeName: nodeName,
                            inStatesPositions: inStatesPositions,
                            outStatesPositions: this.statesList.namesArrayToString(outStatesNames)
                        }; 
                    }
                });
                this.history[this.treeIndex].push(this.trees[this.treeIndex].asString);
            } else this.currentStatus = STATUS.NO_TRANSITION;
        } else {
            if (this.direction === DIRECTION.BOTTOM_UP) {
                if (this.statesList.isFinal(this.currentTree.state)) {
                    this.currentStatus = STATUS.TERMINATED_IN_FINAL_STATE
                    this.currentTree.isFinal = true;
                } else this.currentStatus = STATUS.TERMINATED;
                this.currentTree.isTerminal = true;
            } else {
                if (this.currentTree.areAllTerminalFinal)
                    this.currentStatus = STATUS.TERMINATED_IN_FINAL_STATE;
                else this.currentStatus = STATUS.TERMINATED;
            }
        }
        if (this.currentStatus !== STATUS.RUNNING) return false;
        return true;
    }

    findNode(tree) {
        let node = (this.direction === DIRECTION.BOTTOM_UP) ? tree.leftmostLeaf : tree.lastProcessedNode;
        if (this.direction === DIRECTION.TOP_DOWN && !node)
            node = tree.leftmostProcessedLeaf;
        return node;
    }

    updateNode(node, state, tree) {
        if (node) {
            node.state = state;
            node.isProcessed = true;
        } else {
            node = tree.leftmostProcessedLeaf;
            node.children.push(new Tree(state));
            node.children[0].id = node.id + '-0';
            node = node.children[0];
            node.state = state;
            node.isTerminal = true;
            node.isProcessed = true;
            if (this.statesList.isFinal(node.state))
                node.isFinal = true;
        }
    }

    run() {
        while (this.step()) {}
    }

    runAll() {
        let i = 0;
        while (i < this.trees.length) {
            this.treeIndex = i;
            while (this.step()) {}
            i++;
        }
    }

    get currentTree() {
        return this.trees[this.treeIndex];
    }

    get currentStatus() {
        return this.status[this.treeIndex];
    }

    set currentStatus(status) {
        this.status[this.treeIndex] = status;
    }

    get currentHistory() {
        return this.history[this.treeIndex];
    }

    get currentLastTransition() {
        return this.lastTransition[this.treeIndex];
    }

    get transitionsArray() {
        const array = [];
        const transitions = this.transitionsList.transitions;
        Object.keys(transitions).forEach((nodeName) => {
            Object.keys(transitions[nodeName]).forEach((inStatesPositions) => {
                transitions[nodeName][inStatesPositions].forEach((outStatesNames) => {
                    array.push({
                        nodeName: nodeName,
                        inStatesPositions: inStatesPositions,
                        inStatesNames: this.statesList.positionsStringToArray(inStatesPositions),
                        outStatesNames: outStatesNames,
                        outStatesPositions: this.statesList.namesArrayToString(outStatesNames)
                    });
                });
            });
        });
        return array;
    }
}

class SVG {
    constructor(namee) {
        const el = document.getElementById('svg');
        const clonedNode = el.cloneNode(false);
        el.parentNode.replaceChild(clonedNode, el);
        this.el = clonedNode;
        this.viewBox = {
            width: SVG_MIN_WIDTH * 2,
            height: SVG_MIN_HEIGHT * 2,
            x: -(SVG_MIN_WIDTH - NODE_AREA_LENGTH/2),
            y: -NODE_AREA_LENGTH/2
        };
        this.addEventListeners();
    }

    setViewBox() {
        this.el.setAttribute("viewBox", `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.width} ${this.viewBox.height}`);
    }

    addEventListeners() {
        let isMouseDown = false;
        const beforeMoving = {
            mouse: { x: 0, y: 0 },
            viewBox: { x: 0, y: 0 }
        }
        this.el.addEventListener("wheel", (e) => {
            e.preventDefault();
                
            const wd = this.viewBox.width * (e.deltaY > 0 ? 0.25 : 0.2);
            const hd = this.viewBox.height * (e.deltaY > 0 ? 0.25 : 0.2);
            const newWidth = this.viewBox.width + (e.deltaY > 0 ? wd : -wd);
            const newHeight = this.viewBox.height + (e.deltaY > 0 ? hd : -hd);
            if (newWidth >= SVG_MIN_WIDTH && newHeight >= SVG_MIN_HEIGHT) {
                this.viewBox.width = newWidth;
                this.viewBox.height = newHeight;

                const elementRect = this.el.getBoundingClientRect();
                this.viewBox.x += (e.deltaY > 0 ? -wd : wd) * ((e.clientX - elementRect.x) / elementRect.width);
                this.viewBox.y += (e.deltaY > 0 ? -hd : hd) * ((e.clientY - elementRect.y) / elementRect.height);
            }

            this.setViewBox();
        });

        this.el.addEventListener("mousedown", (e) => {
            isMouseDown = true;
            beforeMoving.mouse.x = e.clientX;
            beforeMoving.mouse.y = e.clientY;
            beforeMoving.viewBox.x = this.viewBox.x;
            beforeMoving.viewBox.y = this.viewBox.y;
        });

        this.el.addEventListener("mousemove", (e) => {
            if (isMouseDown) {
                const elementRect = this.el.getBoundingClientRect();
                this.viewBox.x = beforeMoving.viewBox.x + (beforeMoving.mouse.x - e.clientX) / (elementRect.width / this.viewBox.width);
                this.viewBox.y = beforeMoving.viewBox.y + (beforeMoving.mouse.y - e.clientY) / (elementRect.height / this.viewBox.height);
                this.setViewBox();
            }
        });

        document.addEventListener("mouseup", (e) => {
            isMouseDown = false;
        });
    }

    node(t, cx, cy) {
        const node = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', NODE_RADIUS);
        circle.setAttribute('cx', cx);
        circle.setAttribute('cy', cy);
        let nodeColor = NODE_COLOR;
        if (t.isFinal) nodeColor = NODE_COLOR_FINAL;
        else if (t.isTerminal) nodeColor = NODE_COLOR_TERMINAL;
        else if (t.isProcessed) nodeColor = NODE_COLOR_PROCESSED;
        circle.setAttribute('fill', nodeColor);
        circle.setAttribute('id', `node${t.id}`);
        circle.setAttribute('data-id', t.id);
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        if (App.configs.viewMode === 'mix') {
            if (t.isProcessed)
                text.textContent = t['state'];
            else
                text.textContent = t['name'];
        } else
            text.textContent = t[App.configs.viewMode];
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('alignment-baseline', 'middle');
        text.setAttribute('font-size', '7');
        text.setAttribute('x', cx);
        text.setAttribute('y', cy);
        node.appendChild(circle);
        node.appendChild(text);
        return node;
    }

    edge(x1, y1, x2, y2) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', 'black');
        return line;
    }

    analyze(t, level) {
        t.children.forEach((child) => {
            this.analyze(child, level + 1);
        })
        if (this.treeLevelsWidths[level] === undefined)
            this.treeLevelsWidths[level] = 1;
        else this.treeLevelsWidths[level]++;
    }

    draw(t, level) {
        if (this.countNodes[level] === undefined)
            this.countNodes[level] = 1;
        else this.countNodes[level]++;
        t.children.forEach((child) => {
            this.draw(child, level + 1);
        })
        const x = NODE_AREA_LENGTH * this.countNodes[level] - NODE_AREA_LENGTH * this.treeLevelsWidths[level] / 2;
        const y = NODE_AREA_LENGTH * level;
        if (level > 0) {
            const prevX = NODE_AREA_LENGTH * this.countNodes[level - 1] - NODE_AREA_LENGTH * this.treeLevelsWidths[level - 1] / 2;
            const prevY = NODE_AREA_LENGTH * (level - 1);
            this.el.appendChild(this.edge(prevX, prevY, x, y));
        }
        this.el.appendChild(this.node(t, x, y));
    }

    drawTree(t) {
        this.treeLevelsWidths = [];
        this.countNodes = [];
        this.analyze(t, 0);
        this.draw(t, 0);
        this.setViewBox();
    }

    updateNode(node) {
        if (!node) return false;
        const circle = document.getElementById(`node${node.id}`);
        if (circle !== null) {
            let nodeColor = NODE_COLOR;
            if (node.isFinal) nodeColor = NODE_COLOR_FINAL;
            else if (node.isTerminal) nodeColor = NODE_COLOR_TERMINAL;
            else if (node.isProcessed) nodeColor = NODE_COLOR_PROCESSED;
            circle.setAttribute('fill', nodeColor);
            if (App.configs.viewMode === 'mix') {
                if (node.isProcessed)
                    circle.nextSibling.textContent = node['state'];
                else
                    circle.nextSibling.textContent = node['name'];
            } else
                circle.nextSibling.textContent = node[App.configs.viewMode];
        } else return false;
        return true;
    }
}

class App {
    constructor() {
        this.svg;
        this.automaton;
        this.timer;
        this.running = false;
        this.addEventListeners();
    }

    step() {
        document.getElementById('apply-ranking').disabled = true;
        this.automaton.step();
        const status = this.automaton.status[this.automaton.treeIndex];
        if (status !== STATUS.RUNNING) {
            if (status === STATUS.TERMINATED || status === STATUS.TERMINATED_IN_FINAL_STATE)
                this.svg.updateNode(this.automaton.currentTree);
        } else {
            if (this.automaton.isTransducer) {
                this.drawTree();
            } else {
                this.automaton.lastProcessedNodes.forEach((node) => {
                    if (!this.svg.updateNode(node))
                        this.drawTree();
                });
            }
        }
        this.updateInfo();
    }

    load() {
        const symbols = document.getElementById('symbols').value;
        if (symbols.length === 3) {
            App.configs.symbols.openBracket = symbols[0];
            App.configs.symbols.closedBracket = symbols[1];
            App.configs.symbols.separator = symbols[2];
        }
        this.automaton = new Automaton(document.getElementById('tree').value);
        this.automaton.load(document.getElementById('automaton').value);
        App.configs.viewMode = document.getElementById('view-mode').value;
        const types = ['DFTA', 'NFTA', 'ε-NFTA', 'DFTT', 'NFTT', 'ε-NFTT'];
        const directions = ['Bottom-up', 'Top-down'];
        document.getElementById('automaton-type').textContent = `${directions[this.automaton.direction]} ${types[this.automaton.type + 3 * this.automaton.isTransducer]}`;
        document.getElementById('apply-ranking').disabled = false;
        function join(array) {
            let str = array.join(', ');
            if (array.length > 1) str = `(${str})`;
            return str;
        }
        const transitionsEl = document.getElementById('transitions');
        transitionsEl.innerHTML = '';
        const initial = this.automaton.statesList.initial;
        if (initial) transitionsEl.innerHTML += `<p>Начальное состояние: ${initial}</p>`;
        const finals = this.automaton.statesList.finals;
        if (finals.length > 0) transitionsEl.innerHTML += `<p>Конечные состояния: ${join(finals)}</p>`;
        this.automaton.transitionsArray.forEach((transition) => {
            transition.nodeName = transition.nodeName.replace(/"/g, '&quot;');
            document.getElementById('transitions').innerHTML += `<p id="tr-${transition.nodeName}-${transition.inStatesPositions}-${transition.outStatesPositions}">(${transition.nodeName}, ${join(transition.inStatesNames)}) -> ${join(transition.outStatesNames)}</p>`;
        });
        if (this.automaton.isTransducer) transitionsEl.innerHTML += `<p>&nbsp;</p>
    <p>Вывод:</p>
    <p id="yield">${this.automaton.currentTree.yield}</p>`;
        this.openTab('transitions');
        this.updateInfo();
        this.drawTree();
    }

    save() {
        const text =
    `${document.getElementById('symbols').value}
    ${document.getElementById('tree').value}
    ${document.getElementById('automaton').value}`;
        const el = document.createElement('a');
        el.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        el.setAttribute('download', 'Имя_автомата.fta');
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
            const endline1 = text.indexOf('\n');
            const symbols = text.substring(0, endline1);
            const endline2 = text.indexOf('\n', endline1 + 1);
            const tree = text.substring(endline1 + 1, endline2);
            const automaton = text.substring(endline2 + 1);
            document.getElementById('symbols').value = symbols;
            document.getElementById('tree').value = tree;
            document.getElementById('automaton').value = automaton;
        });
        this.openTab('input');
    }

    applyRanking() {
        this.automaton.currentTree.applyRanking();
        this.automaton.currentTree.reAssignIds('', '0');
        this.drawTree();
        this.updateInfo();
    }

    runFull() {
        document.getElementById('apply-ranking').disabled = true;
        this.automaton.run();
        this.updateInfo();
        this.drawTree();
    }

    runAll() {
        document.getElementById('apply-ranking').disabled = true;
        this.automaton.runAll();
        this.updateInfo();
        this.drawTree();
    }

    run(interval) {
        clearInterval(this.timer);
        this.running = true;
        this.timer = setInterval(() => this.step(), 1000 / interval);
    }

    stop() {
        clearInterval(this.timer);
        this.running = false;
    }

    drawTree() {
        const newSVG = new SVG('svg');
        if (this.svg)
            newSVG.viewBox = this.svg.viewBox;
        this.svg = newSVG;
        this.svg.drawTree(this.automaton.currentTree);
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
        document.getElementById('number-of-trees').textContent = this.automaton.trees.length;
        document.getElementById('current-tree').textContent = this.automaton.treeIndex + 1;
        document.getElementById('history').innerHTML = '';
        const history = this.automaton.currentHistory;
        for (let i = history.length - 1; i >= 0; i--)  {
            if (typeof(history[i]) === 'object') {
                document.getElementById('history').innerHTML += `<p><span class="link" data-id="${history[i].index}">${history[i].type + (history[i].index + 1)}</span></p>`;
            } else {
                document.getElementById('history').innerHTML += `<p>${this.automaton.currentHistory[i]}</p>`;
            }
        };
        const statuses = ['Активен', 'Переход не задан', 'Завершен', 'Завершен в конечном состоянии'];
        const colors = ['blue', 'red', 'red', 'green'];
        document.getElementById('status').textContent = statuses[this.automaton.currentStatus];
        document.getElementById('status').style.color = colors[this.automaton.currentStatus];
        document.getElementById('tree-list').innerHTML = '';
        this.automaton.trees.forEach((tree, index) => {
            document.getElementById('tree-list').innerHTML += `<p>${index + 1}. <span class='link' data-id='${index}'>${tree.asString}</span> (<strong style="color :${colors[this.automaton.status[index]]}">${statuses[this.automaton.status[index]]}</strong>)</p>`;
        });
        let generalStatus;
        if (this.automaton.status.includes(STATUS.RUNNING)) {
            generalStatus = STATUS.RUNNING;
        } else {
            if (this.automaton.status.includes(STATUS.TERMINATED_IN_FINAL_STATE)) {
                generalStatus = STATUS.TERMINATED_IN_FINAL_STATE;
            } else {
                generalStatus = STATUS.TERMINATED;
            }
        }
        document.getElementById('general-status').textContent = statuses[generalStatus];
        document.getElementById('general-status').style.color = colors[generalStatus];
        let lastTransitionEl = document.querySelector('.last-transition');
        if (lastTransitionEl) lastTransitionEl.classList.remove('last-transition');
        const lastTransition = this.automaton.currentLastTransition;
        lastTransition.nodeName = lastTransition.nodeName.replace(/"/g, '"');
        lastTransitionEl = document.getElementById(`tr-${lastTransition.nodeName}-${lastTransition.inStatesPositions}-${lastTransition.outStatesPositions}`);
        if (lastTransitionEl) lastTransitionEl.classList.add('last-transition');
        if (this.automaton.isTransducer) document.getElementById('yield').textContent = this.automaton.currentTree.yield;
        if (this.automaton.status[this.automaton.treeIndex] === STATUS.RUNNING) {
            document.getElementById('step').disabled = false;
            document.getElementById('run-full').disabled = false;
            document.getElementById('run-all').disabled = false;
            document.getElementById('run').disabled = this.running;
            document.getElementById('stop').disabled = !this.running;
        } else {
            document.getElementById('step').disabled = true;
            document.getElementById('run-full').disabled = true;
            document.getElementById('run').disabled = true;
            document.getElementById('stop').disabled = true;
            if (generalStatus !== STATUS.RUNNING) {
                document.getElementById('run-all').disabled = true;
            }
            this.stop();
        }
    }

    addEventListeners() {
        document.getElementById('load').addEventListener('click', () => this.load());
        document.getElementById('save').addEventListener('click', () => this.save());
        document.getElementById('open').addEventListener('click', () => document.getElementById('open-file').click());
        document.getElementById('open-file').addEventListener('change', (e) => this.open(e));
        document.getElementById('step').addEventListener('click', () => this.step());
        document.getElementById('run').addEventListener('click', () => this.run(document.getElementById("sps").value));
        document.getElementById('stop').addEventListener('click', () => { this.stop(); this.updateInfo(); });
        document.getElementById('run-full').addEventListener('click', () => this.runFull());
        document.getElementById('apply-ranking').addEventListener('click', () => this.applyRanking());
        document.getElementById('run-all').addEventListener('click', () => this.runAll());
        document.getElementById('sps').addEventListener('change', () => {
            if (this.automaton.status[this.automaton.treeIndex] === STATUS.RUNNING) {
                if (document.getElementById('run').disabled) {
                    this.stop();
                    this.run(document.getElementById("sps").value);
                }
            }
        });
        document.getElementById('info').addEventListener('click', (e) => {
            if (e.target.classList.contains('link')) {
                this.automaton.treeIndex = parseInt(e.target.dataset.id);
                this.updateInfo();
                this.drawTree();
            }
        });
        document.getElementById('view-mode').addEventListener('change', e => {
            App.configs.viewMode = e.target.value;
            this.drawTree();
        });
        document.getElementById('svg-box').addEventListener('mouseover', (e) => {
            const el = e.target;
            if (el.tagName === 'circle') {
                const id = el.dataset.id;
                const node = this.automaton.currentTree.findNode(id);
                if (node) {
                    
                }
            }
        });
        document.querySelector('.tabs').addEventListener('click', (e) => {
            const id = e.target.dataset.for;
            if (id) this.openTab(id);
        });
        document.getElementById('help').addEventListener('click', (e) => {
            const el = document.querySelector('.popup');
            el.style.visibility = 'visible';
            el.style.opacity = '1';
        });
        document.getElementById('close-help').addEventListener('click', (e) => {
            const el = document.querySelector('.popup');
            el.style.opacity = '0';
            el.style.visibility = 'hidden';
        });
    }
}

App.configs = {
    viewMode: 'name',
    symbols: {
        openBracket: '(',
        closedBracket: ')',
        separator: ','
    }
};

const app = new App();