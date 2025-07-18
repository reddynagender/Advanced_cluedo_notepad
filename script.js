"use strict";
const totalCards = 18;

// Manage Game Data
class ManageSessionStorage{
    createPlayers(playersList){
        sessionStorage.clear();
        let playerStrcture = {};
        let cardsIndividual = getCardDistribution(totalCards, playersList.length)
        for(let i=0;i<playersList.length;i++){
            playerStrcture = {
                name: playersList[i],
                holdingCards: [],
                eliminatedCards: [],
                order: [i],
                noOfCards: cardsIndividual[i],
                cardStatus: false,
            }
            sessionStorage.setItem("player-"+playersList[i], JSON.stringify(playerStrcture));
        }
    }
    getPlayerData(playersList){
        if(playersList === undefined || playersList.length === 0){
            let playersData = [];
            for (let i=0;i<sessionStorage.length;i++){
                let key = sessionStorage.key(i);
                if(key.startsWith("player-")){
                    let playerData = JSON.parse(sessionStorage.getItem(key));
                    // playersData.push(playerData.name);
                    playersData[i] = playerData;
                }
            }
            let sortedPlayers = playersData.filter(Boolean).sort((a, b) => a.order[0] - b.order[0]);
            let newSortedPlayers = [];
            for(let k=0;k<sortedPlayers.length;k++){
                newSortedPlayers.push(sortedPlayers[k].name);
            }
            return newSortedPlayers;
        }else{
            let player = JSON.parse(sessionStorage.getItem("player-"+playersList));
            return player;
        }
    }
    updatePlayerCards(playerName, cards, type){
        let playerData = JSON.parse(sessionStorage.getItem("player-"+playerName));
        if(!playerData){
            console.error(`Player ${playerName} not found in session storage.`);
            return;
        }
        if(!playerData[type].includes(cards)){
            playerData[type].push(cards);
        }
        try{
            sessionStorage.setItem("player-"+playerName,JSON.stringify(playerData));
        }catch(e){
            console.error(`${e} error while updating sessionStorage for data ${playerName} ${cards} ${type}`);
        }
    }
    updateCardStatus(player){
        let playerData = this.getPlayerData(player);
        playerData.cardStatus = true;
        try{
            sessionStorage.setItem('player-'+player,JSON.stringify(playerData));
        }catch(e){
            console.error("Updating cardStatus Failed for"+e);
        }
    }
}
// End Manage Game 

let playersList = [];
let storage = new ManageSessionStorage();

function checkSegmentsCard(overallCards){
    let segmentCards = overallCards;
    let playersNames = storage.getPlayerData();

    for(let i=0;i<overallCards.length;i++){
        for(let j=0;j<playersNames.length;j++){
            let playerData = storage.getPlayerData(playersNames[j]);
            let holdings = playerData.holdingCards;
            if(holdings.includes(overallCards[i].name)){
                segmentCards = segmentCards.filter(card => card.name !== overallCards[i].name);
                break;
            }
        }
    }

    if(segmentCards.length === 1){
        for(let i=0;i<playersNames.length;i++){
            console.log(`segment E from ${playersNames[i]} ${segmentCards[0].name}`)
            controller(playersNames[i],segmentCards[0].name,"eliminatedCards",false,true);
        }
    }
}

async function checkLeftCardInSegment(){
    let elements = await fetch("elements.json");
    let cards = await elements.json();

    let suspects = cards.suspects;
    let weapons = cards.weapons;
    let rooms = cards.rooms;

    checkSegmentsCard(suspects);
    checkSegmentsCard(weapons);
    checkSegmentsCard(rooms);
}

// Manage probabilty strategy
class ProbStrategy{
    // check for confirmed cards
    runCheck(){
        let probArrStor = sessionStorage.getItem("probability");
        this.probArr = JSON.parse(probArrStor);
        for(let play in this.probArr){
            for(let key in this.probArr[play]){
                let arr = this.probArr[play][key];
                // console.log(arr);
                if(arr !== null){
                    if(arr.length === 1){
                        // run controller
                        controller(play,arr[0],"holdingCards",false);
                    }
                }
            }
        }
        // console.log(this.probArr);
    }
    addProb(player,cards){
        let prob = JSON.parse(sessionStorage.getItem("probability")) || {};
        let filteredCard = [];
        let FinalfilteredCard = [];
        let players = storage.getPlayerData();
        for(let k=0;k<cards.length;k++){
            let cardExist = false;
            for(let i=0;i<players.length;i++){
                let playersData = storage.getPlayerData(players[i]);
                if(playersData.holdingCards.includes(cards[k])){
                    cardExist = true;
                }
            }
            if(!cardExist){
                filteredCard.push(cards[k]);
            }
        }
        for(let k=0;k<filteredCard.length;k++){
            let cardExist = false;
            let playerData = storage.getPlayerData(player);
            if(playerData.eliminatedCards.includes(filteredCard[k])){
                cardExist = true;
            }
            if(!cardExist){
                FinalfilteredCard.push(filteredCard[k]);
            }
        }
        if(!prob.hasOwnProperty(player)){
            prob[player] = [FinalfilteredCard];
        }else{
            prob[player].push(FinalfilteredCard);
        }
        try{
            console.log(prob);
            sessionStorage.setItem("probability",JSON.stringify(prob));
            this.runCheck();
        }catch(e){
            console.log(`error adding probability ${e}`);
        }
    }
    // status --true-- if just to remove particular element from person only
    eliminateCards(player,card,status){
        this.probArr = JSON.parse(sessionStorage.getItem("probability"));
        for(let play in this.probArr){
            for(let key in this.probArr[play]){
                let arr = this.probArr[play][key];
                // console.log(arr);
                if(play === player && status === false){
                    if(arr.includes(card)){
                        this.probArr[play][key] = arr.filter(num => num !== card);
                    }
                }
                else if(play === player && status === true){
                    if(arr.includes(card)){
                        console.log(`eliminating for player ${this.probArr[play][key]}`);
                        this.probArr[play][key] = arr.filter(num => num !== card);
                        console.log(this.probArr);
                    }
                }else if(status !== true){
                    if(arr.includes(card)){
                        console.log(`eliminating for player ${this.probArr[play][key]}`);
                        this.probArr[play][key] = arr.filter(num => num !== card);
                        console.log(this.probArr);
                    }
                }
            }
        }
        sessionStorage.setItem("probability",JSON.stringify(this.probArr));
        // this.runCheck();
    }
}
// Manage probabilty strategy

let prob = new ProbStrategy();
// prob.addProb("play1",[1,0,5]);
// console.log(prob.eliminateCards("play1",1,false));

class ReloadInterface{
    run(){
        let players = storage.getPlayerData();
        // console.log(players);
        for(let i=0;i<players.length;i++){
            let playInputs = storage.getPlayerData(players[i]);
            let holdingCards = playInputs.holdingCards;
            let eliminatedCards = playInputs.eliminatedCards;
            
            for(let j=0; j<holdingCards.length; j++){
                let element = document.querySelector(`.gameInput[data-card="${holdingCards[j]}"][data-player="${players[i]}"]`);
                if(element){
                    element.disabled = true;
                    element.innerHTML = "<img src='assets/icons/check.png' class='iconsSizeBtn'>";

                     // active icon for row 
                    let tdParent = element.closest('td');

                    if (tdParent) {
                        // Find sibling with class 'headfontad'
                        const headerSibling = tdParent.parentElement.querySelector('.headfontad');
                        if (headerSibling) {
                            // Find <span> inside that sibling
                            const spanInside = headerSibling.querySelector('span');
                            if (spanInside) {
                                spanInside.classList.add('active');
                            } else {
                                console.warn("No <span> found inside .headfontad");
                            }
                        } else {
                            console.warn("Sibling with class .headfontad not found");
                        }
                    } else {
                        console.warn("Parent <td> not found");
                    }
                     // active icon for row 
                }else{
                    console.log(` element not exist .gameInput[data-card="${holdingCards[j]}"][data-player="${players[i]}"]`);
                }
            }
            for(let j=0; j<eliminatedCards.length; j++){
                let element = document.querySelector(`.gameInput[data-card="${eliminatedCards[j]}"][data-player="${players[i]}"]`);
                if(element){
                    element.disabled = true;
                    element.innerHTML = "<img src='assets/icons/close.png' class='iconsSizeBtn'>";
                }else{
                    console.log(` element not exist .gameInput[data-card="${eliminatedCards[j]}"][data-player="${players[i]}"]`);
                }
            }
        }
    }
}
let reload = new ReloadInterface();

// Declare a variable to store the data globally
let cardsList = [];

async function fetchElements() {
    try {
        const response = await fetch("elements.json");  // Fetch data from the JSON file
        if (!response.ok) {
            console.log("Unable to fetch data.");
            return;
        }

        const data = await response.json();  // Parse the JSON response

        // Extract the required card names and store them in the global variable
        cardsList = [
            ...data.suspects.map(suspect => suspect.name),
            ...data.weapons.map(weapon => weapon.name),
            ...data.rooms.map(room => room.name)
        ];
        return cardsList;
    } catch (error) {
        console.log("Error fetching data:", error);
    }
}

// Call the function to fetch and store data
function filterArray(arr, itemstoremove){
    return arr.filter(name => name !== itemstoremove);
}

function checkPlayerLimit(){
    let players = storage.getPlayerData();
    for(let i=0;i<players.length;i++){
        // console.log(`checking card limit for ${players[i]}`);
        let player = storage.getPlayerData(players[i]);
        let playerCardLimit = player.noOfCards;
        let gameStatus = player.cardStatus;
        if(player.holdingCards.length === playerCardLimit && !gameStatus){
            fetchElements().then((data)=>{
                let list = data;
                for(let j=0;j<player.holdingCards.length;j++){
                    list = filterArray(list,player.holdingCards[j]);
                    // console.log(list);
                }
                for(let j=0;j<list.length;j++){
                    console.log(`eliminating cards from ${players[i]} ${list[j]}`);
                    controller(players[i],list[j],"eliminatedCards",true);
                }
                storage.updateCardStatus(players[i]);
            })
        }
        if(player.eliminatedCards.length === totalCards-playerCardLimit+3 && !gameStatus){
            // console.log(totalCards-playerCardLimit);
            fetchElements().then((data)=>{
                let list = data;
                // console.log(list);
                for(let j=0;j<player.eliminatedCards.length;j++){
                    list = filterArray(list,player.eliminatedCards[j]);
                    // console.log(list);
                }
                for(let j=0;j<list.length;j++){
                    console.log(`holding cards from ${players[i]} ${list[j]}`);
                    controller(players[i],list[j],"holdingCards",true);
                }
                storage.updateCardStatus(players[i]);
            })
        }
    }
}

// if recurring is true then it stop running cardLimitCheck
function controller(player,card,type,recurring,checkSegment=false){

    // add or remove card from player
    storage.updatePlayerCards(player,card,type);

    // remove card from all players if other player has the card
    if(type === "holdingCards"){
        let players = storage.getPlayerData();
        for(let i=0;i<players.length;i++){
            if(players[i] !== player){
                storage.updatePlayerCards(players[i],card,"eliminatedCards");
            }
        }
    }

    // run probability strategy
    prob.eliminateCards(player,card,type === "holdingCards" ? false : true);

    // check all players cardsLimit
    if(!recurring){
        checkPlayerLimit();
    }

    // run probability single element exist check
    prob.runCheck();

    // check if segment cleared
    if(!checkSegment){
        checkLeftCardInSegment();
    }

    // reload the interface
    reload.run();
}

function getCardDistribution(totalCards, numPlayers) {
  const base = Math.floor(totalCards / numPlayers);
  const remainder = totalCards % numPlayers;

  return Array.from({ length: numPlayers }, (_, i) =>
    i < remainder ? base + 1 : base
  );
}

document.addEventListener("DOMContentLoaded", function() {


    // Handle Player Count Input
    let playerCount = document.getElementById("playerCount");
    let playersContainer = document.getElementById("playersInputs");
    if(playerCount){
        playerCount.addEventListener("change",function(){
            let count = playerCount.value;
            playersContainer.innerHTML = "";
            for(let i=0;i<count;i++){
                let input = document.createElement("input");
                input.type = "text";
                input.name = `player${i+1}`;
                input.placeholder = `player ${i+1} Name`;
                
                if(playersContainer){
                    playersContainer.appendChild(input);
                }
            }
        })
    }else{
        console.warn("Player count input not found.");
    }
    // Handle Player Count Input

    // Handle Player Count Form Submission
    let playerForm = document.getElementById("playerCountForm");
    if(playerForm){
        playerForm.addEventListener("submit",function(e){
            e.preventDefault();
            playersList = [];
            // console.log(playerCount.value);
            for(let i=0;i<playerCount.value;i++){
                let playerName = document.querySelector(`input[name="player${i+1}"]`);
                playersList.push(playerName.value);
            }
            try{
                storage.createPlayers(playersList);
            }catch(error){
                console.error("Error Creating Players:", error);
            }
            const choosePlayersDiv = document.querySelector(".choosePlayers");
            if (choosePlayersDiv) {
                choosePlayersDiv.style.display = "none";
            }
            generateGameTable();
        })
    }else{
        console.warn("Player count form not found.");
    }
    // Handle Player Count Form Submission

    async function generateGameTable(){
        const gameBoard =  document.querySelector(".gameBoard");
        const board = document.querySelector("#board");
        if(gameBoard){
            gameBoard.style.display = "block";
        }
        try {
            let data = await fetch('elements.json');
            let elements = await data.json();
            let suspects = elements.suspects;
            let weapons = elements.weapons;
            let rooms = elements.rooms;

            let gameTable = document.createElement("table");
            gameTable.className = "gameTable";

            //create table header
            let tableHeader = document.createElement("thead");
            let headerRow = document.createElement("tr");
            let playersNames = storage.getPlayerData();
            let blankth = document.createElement("th");
            blankth.textContent = "";
            headerRow.appendChild(blankth);
            playersNames.forEach(player => {
                if(player !== undefined && player !== null && player !== ""){
                    let th = document.createElement("th");
                    th.textContent = player;
                    th.innerHTML = `${player}<br><span class="playerClicki" data-player="${player}">Update Turn</span>`;
                    th.className = "";
                    th.setAttribute("data-player",player);
                    headerRow.appendChild(th);
                }
            })
            tableHeader.appendChild(headerRow);
            gameTable.appendChild(tableHeader);
            //create table header

            // create table body
            let tableBody = document.createElement("tbody");

            // create suspects row
            let elementsRow = document.createElement("tr");
            let elementsTh = document.createElement("th");
            let cardsLeader = document.getElementsByClassName("popupSuspectChoose")[0].querySelector(".cardsList");
            elementsTh.textContent = "Suspects";
            elementsTh.className = "headingSubSub";
            elementsTh.colSpan = playersNames.length + 1;
            elementsRow.appendChild(elementsTh);
            tableBody.appendChild(elementsRow);

            suspects.forEach(suspect => {
                let suspectTr = document.createElement("tr");
                let suspectTh = document.createElement("th");
                suspectTh.innerHTML = `<span></span><img src="${suspect.image}" class="susImg" alt="${suspect.name}">${suspect.name}`;
                suspectTh.className = `suspect-${suspect.name} headfontad`;
                suspectTh.setAttribute("data-suspect", suspect.name);
                suspectTh.setAttribute("status", '');
                suspectTr.appendChild(suspectTh);
                playersNames.forEach(player => {
                    if(player !== undefined && player !== null && player !== ""){
                        let playerTd = document.createElement("td");
                        playerTd.className = `gamer-${player}`;
                        playerTd.setAttribute("data-player", player);
                        playerTd.innerHTML = `<button class="gameInput" data-card="${suspect.name}" data-player="${player}"></button>`;
                        suspectTr.appendChild(playerTd);
                    }
                })
                tableBody.appendChild(suspectTr);
                
                // generating for choose board
                let chooseBoard = document.createElement("img");
                chooseBoard.src = suspect.image;
                chooseBoard.setAttribute("data-card",suspect.name);
                chooseBoard.className = "suspectCBoard";
                cardsLeader.appendChild(chooseBoard);
            })
            // create suspects row

            // create weapon row
            let roomTr = document.createElement('tr');
            let roomth = document.createElement('th');
            let cardsLeader2 = document.getElementsByClassName("popupWeaponChoose")[0].querySelector(".cardsList");
            roomth.textContent = "Weapons";
            roomth.className = "headingSubSub";
            roomth.colSpan = playersNames.length + 1;
            roomTr.appendChild(roomth);
            tableBody.appendChild(roomTr);
            
            weapons.forEach(weapon => {
                let weaTr = document.createElement("tr");
                let weaTd = document.createElement("th");
                weaTd.innerHTML = `<span></span><img src="${weapon.image}" class="susImg"  alt="${weapon.name}">${weapon.name}`;
                weaTd.className = `weapon-${weapon.name} headfontad`;
                weaTd.setAttribute("data-weapon", weapon.name);
                weaTd.setAttribute("status", '');
                weaTr.appendChild(weaTd);
                playersNames.forEach(player => {
                    if(player !== undefined && player !== null && player !== ""){
                        let playerTd = document.createElement("td");
                        playerTd.className = `gamer-${player}`;
                        playerTd.setAttribute("data-player", player);
                        playerTd.innerHTML = `<button class="gameInput" data-card="${weapon.name}" data-player="${player}"></button>`;
                        weaTr.appendChild(playerTd);
                    }
                });
                tableBody.appendChild(weaTr);

                // generating for choose board
                let chooseBoard = document.createElement("img");
                chooseBoard.src = weapon.image;
                chooseBoard.setAttribute("data-card",weapon.name);
                chooseBoard.className = "weaponCBoard";
                cardsLeader2.appendChild(chooseBoard);
            })
            // create weapon row

            // create room row
            let weaponTr = document.createElement('tr');
            let weaponth = document.createElement('th');
            let cardsLeader3 = document.getElementsByClassName("popupRoomChoose")[0].querySelector(".cardsList");
            weaponth.textContent = "Rooms";
            weaponth.className = "headingSubSub";
            weaponth.colSpan = playersNames.length + 1;
            weaponTr.appendChild(weaponth);
            tableBody.appendChild(weaponTr);
            
            rooms.forEach(room => {
                let roTr = document.createElement("tr");
                let roTd = document.createElement("th");
                roTd.innerHTML = `<span></span><img src="${room.image}" class="susImg"  alt="${room.name}">${room.name}`;
                roTd.className = `rooms-${room.name} headfontad`;
                roTd.setAttribute("data-rooms", room.name);
                roTd.setAttribute("status", '');
                roTr.appendChild(roTd);
                playersNames.forEach(player => {
                    if(player !== undefined && player !== null && player !== ""){
                        let playerTd = document.createElement("td");
                        playerTd.className = `gamer-${player}`;
                        playerTd.setAttribute("data-player", player);
                        playerTd.innerHTML = `<button class="gameInput" data-card="${room.name}" data-player="${player}"></button>`;
                        roTr.appendChild(playerTd);
                    }
                });
                tableBody.appendChild(roTr);
                
                // generating for choose board
                let chooseBoard = document.createElement("img");
                chooseBoard.src = room.image;
                chooseBoard.setAttribute("data-card",room.name);
                chooseBoard.className = "roomCBoard";
                cardsLeader3.appendChild(chooseBoard);
            })
            // create rooms row
            
            // create table body
            gameTable.appendChild(tableBody);
            board.appendChild(gameTable);
        } catch(error) {
            console.error("Error generating game table:", error);
        }

        // user clicked identified card
        let cardStatus = document.querySelectorAll('.gameInput');
        if(cardStatus){
            cardStatus.forEach(el => {
                el.addEventListener("click",(e)=>{
                    e.preventDefault();
                    let card = e.target.getAttribute("data-card");
                    let player = e.target.getAttribute("data-player");

                    controller(player,card,"holdingCards",false);

                });
            });
        }
        // end user clicked identified card

        reload.run();
    }
   
    document.querySelector(".closme").addEventListener("click",()=>{
        document.querySelector(".choosePlayTurn").classList.toggle('showbox');
    });
    
    document.querySelector("body").addEventListener("click",function(event){
        if (event.target && event.target.classList.contains("playerClicki")) {
            let player = event.target.getAttribute("data-player");
            document.querySelector(".choosePlayTurn").classList.toggle('showbox');
            document.querySelector(".turnName").innerHTML = player;

            let allPlayers = storage.getPlayerData();
            let playerStore = document.getElementsByClassName("playerOpted")[0];
            playerStore.innerHTML="";
            for(let i=0;i<allPlayers.length;i++){
                if(player !== allPlayers[i]){
                    let btn = document.createElement("button");
                    btn.textContent = allPlayers[i];
                    btn.className = "playersCapture";
                    btn.setAttribute("data-player",allPlayers[i]);

                    playerStore.appendChild(btn);
                }
            }
        }
        if(event.target && event.target.classList.contains("playersCapture")) {
            console.log("clicked player capture");
            let player = event.target.getAttribute("data-player");
            let suspect = document.getElementsByClassName("optsuspect")[0].getAttribute("data-card");
            let weapon = document.getElementsByClassName("optweapon")[0].getAttribute("data-card");
            let room = document.getElementsByClassName("optroom")[0].getAttribute("data-card");
            let askedPlayer = document.getElementsByClassName("turnName")[0].getHTML();

            let allPlayers = storage.getPlayerData();
            console.log("all players");
            console.log(allPlayers);
            let revAllPlayers = allPlayers.reverse();
            console.log("rev players");
            console.log(revAllPlayers);

            let startArr = revAllPlayers.indexOf(askedPlayer);
            console.log("start players");
            console.log(startArr);
            let endArr = revAllPlayers.indexOf(player);
            console.log("end players");
            console.log(endArr);

            let eliminatePlayerCards = [];
            
            if(startArr > endArr){
                eliminatePlayerCards = revAllPlayers.slice(startArr+1).concat(revAllPlayers.slice(0,endArr));
            }else{
                eliminatePlayerCards = revAllPlayers.slice(startArr+1,endArr);
            }

            console.log(eliminatePlayerCards);
            for(let i=0;i<eliminatePlayerCards.length;i++){
                console.log(`eliminating for ${eliminatePlayerCards[i]} ${suspect} ${weapon} ${room}`);
                controller(eliminatePlayerCards[i],suspect,"eliminatedCards",false);
                controller(eliminatePlayerCards[i],weapon,"eliminatedCards",false);
                controller(eliminatePlayerCards[i],room,"eliminatedCards",false);
            }

            let cardExistPlayer = storage.getPlayerData(player);

            let probDataArr = [];
            if(!cardExistPlayer.holdingCards.includes(suspect)){
                probDataArr.push(suspect);
            }
            if(!cardExistPlayer.holdingCards.includes(weapon)){
                probDataArr.push(weapon);
            }
            if(!cardExistPlayer.holdingCards.includes(room)){
                probDataArr.push(room);
            }

            try{
                // prob.addProb("play1",[1,0,5]);
                prob.addProb(player,probDataArr);
                document.getElementsByClassName("choosePlayTurn")[0].classList.toggle("showbox");
            }catch(e){
                console.warn(e);
            }
        }
        if(event.target && event.target.classList.contains("suspectCBoard")) {
            let card_Name = event.target.getAttribute("data-card");
            let card_img = event.target.getAttribute("src");
            let query = document.getElementsByClassName("optsuspect");

            query[0].setAttribute("data-card",card_Name);
            query[0].querySelector("img").setAttribute("src",card_img);
            query[0].querySelector("p").textContent = card_Name;
            
            document.getElementsByClassName("popupSuspectChoose")[0].classList.toggle("showbox");
        }
        if(event.target && event.target.classList.contains("weaponCBoard")) {
            let card_Name = event.target.getAttribute("data-card");
            let card_img = event.target.getAttribute("src");
            let query = document.getElementsByClassName("optweapon");

            query[0].setAttribute("data-card",card_Name);
            query[0].querySelector("img").setAttribute("src",card_img);
            query[0].querySelector("p").textContent = card_Name;
            document.getElementsByClassName("popupWeaponChoose")[0].classList.toggle("showbox");
        }
        if(event.target && event.target.classList.contains("roomCBoard")) {
            let card_Name = event.target.getAttribute("data-card");
            let card_img = event.target.getAttribute("src");
            let query = document.getElementsByClassName("optroom");

            query[0].setAttribute("data-card",card_Name);
            query[0].querySelector("img").setAttribute("src",card_img);
            query[0].querySelector("p").textContent=card_Name;
            document.getElementsByClassName("popupRoomChoose")[0].classList.toggle("showbox");
        }
    });
    
    document.getElementsByClassName("optsuspect")[0].addEventListener("click",()=>{
        document.getElementsByClassName("popupSuspectChoose")[0].classList.toggle("showbox");
    });
    document.getElementsByClassName("weaponCard")[0].addEventListener("click",()=>{
        document.getElementsByClassName("popupWeaponChoose")[0].classList.toggle("showbox");
    });
    document.getElementsByClassName("roomCard")[0].addEventListener("click",()=>{
        document.getElementsByClassName("popupRoomChoose")[0].classList.toggle("showbox");
    });

    if(storage.getPlayerData().length > 0){
        document.querySelector(".choosePlayers").style.display="none";
        document.querySelector(".gameBoard").style.display="block";
        generateGameTable();
    }

    document.querySelector(".theend").addEventListener("click",function(){
        sessionStorage.clear();
        location.reload();
    });

});

