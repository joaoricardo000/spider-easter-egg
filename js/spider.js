// --  VARS DECLARATIONS
var context;
var canvas;

var cardWidth;
var cardHeight;
var __naipes = ['spades', 'hearts', 'clubs', 'diamonds'];

//for undo plays
var gameState = [];

//card Status
var Status = {
    faceDown: 0,
    faceUp: 1,
    selected: 2
};

var decks = [];
var topDecks = [];
var completedDecks = [];

//cards images
var cards = [];
var faceDownImage;

var unusedCards = [];

//1 or 2 or 4
var __numNaipes = 1;

var px, py;// mouse position on mousedown

var dragging = false;

var selectedCard = 0, selectedDeck = 0;
// --  END VARS DECLARATIONS

window.onload = initAll;

function initAll() {
    document.getElementById('btNewGame').onclick = newGame;
    document.getElementById('btUndo').onclick = undo;

    canvas = document.getElementById('spiderCanvas');
    context = canvas.getContext('2d');

    //LOAD IMAGES
    faceDownImage = new Image();
    faceDownImage.src = 'media/cards/back.png';

    for (var i = 0; i < 4; i++) {
        cards[i] = [];
        for (j = 1; j < 14; j++) {
            cards[i][j] = new Image();
            cards[i][j].src = 'media/cards/' + j + __naipes[i] + '.png';
        }
    }

    //CARD SIZE
    cardWidth = canvas.width / 11;
    cardHeight = cardWidth * 1.52;

    //EVENTS
    canvas.addEventListener('mousedown', mouse_down, false);
    canvas.addEventListener('mousemove', mouse_move, false);
    canvas.addEventListener('mouseup', mouse_up, false);

    newGame();
}

function newGame() {
    decks = [];
    topDecks = [];
    completedDecks = [];

    //createCards(2 decks, number of naipes, random = true) -> return array of cards
    __numNaipes = parseInt(document.querySelector("#selectLvl").value);
    unusedCards = createCards(2, __numNaipes, true);

    setBottonDecks();
    setTopDecks();

    faceDownImage.onload = function () {
        redraw();
    };
    cards[3][13].onload = function () {
        redraw();
    };
    redraw();

    gameState = [];
    saveState();
}

function setBottonDecks() {
    //Create 10 collumns of cards
    for (i = 0; i < 10; i++) {
        decks[i] = [];
    }

    var i = 0;
    var deck = 0;
    while (i < 54) {
        decks[deck].push(unusedCards.pop());
        i++;
        if (deck < 9) {
            deck++;
        } else {
            deck = 0;
        }
    }

    //Put the top card of each collumn face up
    for (i = 0; i < 10; i++) {
        decks[i][decks[i].length - 1].status = Status.faceUp;
    }
}

function setTopDecks() {
    //Create 5 decks of cards
    for (var i = 0; i < 5; i++) {
        topDecks[i] = [];
    }

    i = 0;
    var ed = 0;
    while (i < 50) {
        var card = unusedCards.pop();
        card.status = Status.faceUp;
        topDecks[ed].push(card);
        i++;
        if (i % 10 == 0) {
            ed++;
        }
    }
}

function createCards(numDecks, nNipes, random) {
    // RETURN A ARRAY OF numDecks * 54 cards of nNipes different nipes, randomize if random == True
    // OBJECT OF THE ARRAY = new Card(naipe,num) eg.: Card("Spades",3)

    var orderedDeck = [];
    var naipe = -1;
    for (var i = 0; i < 4 * numDecks; i++) {

        if (i % (4 * numDecks / nNipes) == 0) {
            naipe++;
        }

        for (var j = 1; j < 14; j++) {
            orderedDeck.push(new Card(naipe, j));
        }
    }

    var finalDeck = orderedDeck;

    if (random) {
        var randomDeck = [];
        while (orderedDeck.length > 0) {
            var pos = Math.floor(Math.random() * orderedDeck.length);
            randomDeck.push(orderedDeck.splice(pos, 1)[0]);
        }
        finalDeck = randomDeck;
    }

    return finalDeck;
}

function mouse_down(ev) {
    var mousePos = getMousePos(ev);
    px = mousePos[0];
    py = mousePos[1];

    //testing if clicked on the extra top decks
    if (py <= cardHeight && topDecks[0] && px <= (topDecks[topDecks.length - 1].x + cardWidth)) {
        //testing if there is no empty column
        var possible = true;
        for (i = 0; i < 10; i++) {
            if (decks[i].length == 0) {
                possible = false;
            }
        }
        if (possible) {
            //deals one top deck
            saveState();
            var edeck = topDecks.pop();
            for (i = 0; i < 10; i++) {
                decks[i].push(edeck.pop());
            }
            redraw();
        }
    } else {
        for (var i = 9; i >= 0; i--) {
            //check witch column was clicked
            if (px >= decks[i].x && px <= decks[i].x + cardWidth) {
                if (decks[i].length > 0) {
                    for (j = decks[i].length - 1; j >= 0; j--) {
                        //check for each card in column
                        if (decks[i][j].status == Status.faceUp) {
                            if (py >= decks[i][j].y
                                && py <= decks[i][j].y + cardHeight) {
                                //found card in px,py
                                dragging = checkSequence(i, j);
                                if (dragging) {
                                    for (k = j; k < decks[i].length; k++) {
                                        decks[i][k].status = Status.selected;
                                    }
                                    selectedDeck = i;
                                    selectedCard = j;
                                }
                                break;
                            }
                        }
                    }
                }
            }
        }
    }
}

function mouse_move(ev) {
    var mousePos = getMousePos(ev);
    var dx = px - mousePos[0];
    var dy = py - mousePos[1];

    if (dragging) {
        redraw();
        for (var i = selectedCard; i < decks[selectedDeck].length; i++) {
            decks[selectedDeck][i].drawMove(dx, dy);
        }
    }
}

function mouse_up(ev) {
    //only does something if dragging...
    if (dragging) {
        var mousePos = getMousePos(ev);
        var dx = px - mousePos[0];

        var xTarget = decks[selectedDeck][selectedCard].x - dx + cardWidth / 2;

        for (var j = selectedCard; j < decks[selectedDeck].length; j++) {
            decks[selectedDeck][j].status = Status.faceUp;
        }

        for (var i = 0; i < 10; i++) {
            var xMinColumn = decks[i].x;

            if (decks[i + 1]) {
                var xMaxColumn = decks[i].x + cardWidth + (cardWidth * 0.05);
            } else {
                var xMaxColumn = canvas.width;
            }

            if (xTarget < xMaxColumn && xTarget > xMinColumn) {
                if (decks[i].length == 0
                    || decks[selectedDeck][selectedCard].number == decks[i][decks[i].length - 1].number - 1) {
                    //save state
                    saveState();
                    //remove sequence from selected deck
                    var seq = decks[selectedDeck].splice(selectedCard, decks[selectedDeck].length - selectedCard);

                    //and puts on the target deck
                    for (j = 0; j < seq.length; j++) {
                        decks[i].push(seq[j]);
                    }

                    //check if completed K-A
                    if (checkFullSequence(i)) {
                        completedDecks.push(decks[i][decks[i].length - 13]);
                        decks[i].splice(decks[i].length - 13, 13);

                        if (decks[i].length >= 1) {
                            decks[i][decks[i].length - 1].status = Status.faceUp;
                        }

                        if (checkEndGame()) {
                            var endGameAnimation = new EndAnimation();
                            endGameAnimation.start();
                        }
                    }

                    //if there is any card below the selected card's old deck, put it face up
                    if (decks[selectedDeck][selectedCard - 1]) {
                        decks[selectedDeck][selectedCard - 1].status = Status.faceUp;
                    }
                    break;
                }

            }
        }
        dragging = false;
        redraw();
    }
}

function getMousePos(evt) {
    var rect = canvas.getBoundingClientRect();
    return [(evt.clientX - rect.left) / (rect.right - rect.left) * canvas.width, (evt.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height]
}


function checkSequence(deckNum, cardPos) {
    //check if a card have sequence cards above itself
    var deck = decks[deckNum];
    var isSequence = true;
    if (deck[cardPos + 1]) {
        for (var k = cardPos + 1; k < deck.length; k++) {
            if (!(deck[k].naipe == deck[k - 1].naipe) || !(deck[k].number == deck[k - 1].number - 1)) {
                isSequence = false;
            }
        }
    }
    return isSequence;
}

function checkFullSequence(deckNum) {
    //checks if a column have a A-K sequence;
    var deck = decks[deckNum];
    if (deck.length >= 13 && deck[deck.length - 13].status == Status.faceUp) {
        var pos = deck.length - 1;
        for (var k = pos; k > pos - 12; k--) {
            if (!(deck[k].naipe == deck[k - 1].naipe) || !(deck[k].number == deck[k - 1].number - 1)) {
                return false;
            }
        }
        return true;
    }
    return false;
}

function checkEndGame() {
    return completedDecks.length == 8;
}

function saveState() {
    var stateDeck = new Array(10);
    for (var i = 0; i < 10; i++) {
        stateDeck[i] = [];
        for (var j = 0; j < decks[i].length; j++) {
            var c = decks[i][j];
            var newC = new Card(c.naipe, c.number);
            newC.status = c.status;
            newC.x = c.x;
            newC.y = c.y;

            stateDeck[i].push(newC);
        }
    }

    var stateTopDeck = [];
    for (var i = 0; i < topDecks.length; i++) {
        stateTopDeck.push(topDecks[i].slice(0));
    }

    var stateCompletedDecks = [];
    for (var i = 0; i < completedDecks.length; i++) {
        stateCompletedDecks.push(completedDecks[i]);
    }

    gameState.push([stateDeck, stateTopDeck, stateCompletedDecks]);
}

function undo() {
    if (gameState.length > 0) {
        var loadState = gameState.pop();
        decks = loadState[0];
        topDecks = loadState[1];
        completedDecks = loadState[2];
        redraw();
    }
}

function redraw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    var posx = cardWidth * 0.05;
    //draw top decks
    for (var i = 0; i < topDecks.length; i++) {
        topDecks[i].x = posx;
        topDecks[i].y = 0;
        drawCard(faceDownImage, posx, 0);
        posx += cardWidth * 0.3;
    }

    //draw completed decks
    posx = canvas.width - cardWidth;
    for (i = 0; i < completedDecks.length; i++) {
        completedDecks[i].x = posx;
        completedDecks[i].y = 0;
        completedDecks[i].status = 1;
        completedDecks[i].draw();
        posx -= cardWidth * 0.3;
    }

    //draw bottom decks
    posx = cardWidth * 0.05;
    for (i = 0; i < 10; i++) {
        var posy = cardHeight + cardHeight * 0.05;
        decks[i].x = posx;
        for (j = 0; j < decks[i].length; j++) {
            if (decks[i][j - 1] && decks[i][j - 1].status != Status.faceDown) {
                posy += cardHeight * 0.09;
            }
            decks[i][j].x = posx;
            decks[i][j].y = posy;
            if (decks[i][j].status != Status.selected) {
                decks[i][j].draw();
            }
            posy += cardHeight * 0.09;
        }
        posx += cardWidth + cardWidth * 0.1;
    }
}

function drawCard(card, x, y) {
    context.drawImage(card, x, y, cardWidth, cardHeight);
}

function Card(_naipe, _number) {
    this.naipe = _naipe;
    this.number = _number;
    this.status = Status.faceDown;
    this.x = 0;
    this.y = 0;
    this.draw = function () {
        if (this.status == Status.faceDown) {
            drawCard(faceDownImage, this.x, this.y);
        } else {
            drawCard(cards[this.naipe][this.number], this.x, this.y);
        }
    };
    this.drawMove = function (_px, _py) {
        var xMv = this.x - _px;
        var yMv = this.y - _py;
        if (this.status == Status.faceDown) {
            drawCard(faceDownImage, xMv, yMv);
        } else {
            drawCard(cards[this.naipe][this.number], xMv, yMv);
        }
    };
    this.drawAt = function (_px, _py) {
        drawCard(cards[this.naipe][this.number], _px, _py);
    };
}

function EndAnimation() {
    this.interval = null;
    this.tInterval = 30;
    this.currentCard = null;
    this.currentIndex = 0;

    this._aY = 4;
    this.vX = null;
    this.vY = null;
    this.k = null;

    this.curX = 0;
    this.curY = 0;

    this.start = function () {
        redraw();
        this.currentCard = completedDecks[completedDecks.length - this.currentIndex - 1];
        this.startAnimateCard();
    };

    this.next = function () {
        clearInterval(this.interval);
        if (++this.currentIndex < completedDecks.length) {
            this.currentCard = completedDecks[completedDecks.length - this.currentIndex - 1];
            this.startAnimateCard();
        }
    };

    this.startAnimateCard = function () {
        this.curX = this.currentCard.x;
        this.curY = this.currentCard.y;
        this.vX = 6 + parseInt(Math.random() * 6);
        this.vY = -(10 + parseInt(Math.random() * 10));
        this.k = 0.6 + Math.random() * 0.3;
        var self = this;
        this.interval = setInterval(function () {
            self.animateCurrentCard();
        }, this.tInterval)
    };

    this.animateCurrentCard = function () {
        this.curX = this.curX - this.vX;
        this.vY = this.vY + this._aY;
        this.curY = this.curY + this.vY;
        if ((this.curY + cardHeight) > canvas.height) {
            this.curY = canvas.height - cardHeight;
            this.vY = -(this.vY * this.k);
        }
        this.currentCard.drawAt(this.curX, this.curY);
        if ((this.curX + cardWidth) < 0)
            this.next();
    }
}