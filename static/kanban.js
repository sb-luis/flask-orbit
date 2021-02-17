const body = document.querySelector('body');
const slider = document.querySelector('.slider');
const darkSwitch = document.querySelector('#switch-dark');
const lightSwitch = document.querySelector('#switch-light');
const navBar = document.querySelector('.nav-bar');
const todoBoard = document.querySelector('#todo-board');
const progressBoard = document.querySelector('#progress-board');
const doneBoard = document.querySelector('#done-board');

let dragging = false;
let cards = [];
let currentCard = null;

//Fetch cards from the server and add them to an array in memory
getAllCards();

/* THEME SWITCH */
let theme = localStorage.getItem('theme');

if (theme == 'light') {
  body.classList.remove('dark');
  body.classList.add('light');
  darkSwitch.classList.add('hidden');
  lightSwitch.classList.remove('hidden');
}else if(theme == 'dark'){
  body.classList.add('dark');
  body.classList.remove('light');
  darkSwitch.classList.remove('hidden');
  lightSwitch.classList.add('hidden');
}

darkSwitch.addEventListener('click', () => {
  body.classList.remove('dark');
  body.classList.add('light');
  darkSwitch.classList.add('hidden');
  lightSwitch.classList.remove('hidden');

  localStorage.setItem('theme', 'light');
});

lightSwitch.addEventListener('click', () => {
  body.classList.add('dark');
  body.classList.remove('light');
  darkSwitch.classList.remove('hidden');
  lightSwitch.classList.add('hidden');

  localStorage.setItem('theme', 'dark');
});

/* SECTIONS */
let snapLocked = false;
let sectionID = 0;
const sections = [...document.querySelectorAll('section')];

sections.forEach((section) => {
  //Set sections ids
  section.id = 'section-' + sectionID;
  sectionID++;

  section.addEventListener('click', (e) => {
    e.preventDefault();
    //SNAP
    if (!dragging && !snapLocked) {
      //Snap to the hovered section.
      snapLocked = true;
      const offsetLeft = section.offsetLeft;
      slider.scrollLeft = offsetLeft;
      //Wait half a second before unlocking this block of code.
      setTimeout(unlockSnapping, 500);
    }
  })

  section.addEventListener('dragover', (e) => {
    e.preventDefault();
    //SNAP
    if (!snapLocked) {
      //Snap to the hovered section.
      snapLocked = true;
      const offsetLeft = section.offsetLeft;
      slider.scrollLeft = offsetLeft;
      //Wait half a second before unlocking this block of code.
      setTimeout(unlockSnapping, 500);
    }

    //SCROLL
    const box = section.getBoundingClientRect();

    //Scroll up and down when reaching borders of the section
    if (e.clientY - box.top < 80) {
      section.querySelector('.board').scrollBy({ top: -10 });
    } else if (box.bottom - e.clientY < 80) {
      section.querySelector('.board').scrollBy({ top: 10 });
    }
  });
});

function unlockSnapping() {
  snapLocked = false;
}

/* BOARDS */
const containers = [...document.querySelectorAll('.board')];
containers.forEach((container) => {
  container.addEventListener('dragover', (e) => {
    e.preventDefault();

    const afterElement = getElementsAfterMouse(container, e.clientY);

    const draggable = document.querySelector('.dragging');

    if (draggable == null) return;

    if (!afterElement) {
      container.append(draggable);
    } else {
      afterElement.before(draggable);
    }
  });
});

function getElementsAfterMouse(container, y) {
  const childs = [...container.querySelectorAll('.board-item:not(.dragging)')];

  return childs.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY, element: undefined }
  ).element;
}

/* DRAGGABLES */
const draggables = [...document.querySelectorAll('.board-item')];

/* NAVBAR */
const themeSelector = document.querySelector('.theme-selector');
const userProfile = document.querySelector('#user-profile');
const deleteCardIcon = document.querySelector('#delete-card-icon');
const createCardIcon = document.querySelector('#create-card-icon');

function toggleNavBar(i) {
  if (i == 0) {
    //Hide navbar elements when number is zero
    themeSelector.classList.add('hidden');
    userProfile.classList.add('hidden');
    createCardIcon.classList.add('hidden');
  } else {
    //If number not equal zero, show navbar elements.
    themeSelector.classList.remove('hidden');
    userProfile.classList.remove('hidden');
    createCardIcon.classList.remove('hidden');
  }
}

/* POP-UP FORM */
const popUpForm = document.querySelector('.pop-up-menu');
const yesOption = popUpForm.querySelector('.yes');
const noOption = popUpForm.querySelector('.no');
const otherOption = popUpForm.querySelector('.other');
const errorMessage = document.querySelector('#error-message');
let popUpState = '';
let popUpInput = null;
let popUpTextArea = null;
let cardContentLength = null;
let cardContentWarning = false;

document.addEventListener('keyup', (e) => {
  if (popUpTextArea != null && popUpInput != null) {
    //Validate input
    let error = validateContent(popUpInput.value, popUpTextArea.value);
    if (error){ 
      errorMessage.innerHTML = error;
    }else {
      errorMessage.innerHTML = '';
    }

    let len = popUpTextArea.value.length;
    cardContentLength.innerHTML = `${len}/250`;
    if (len > 250) {
      cardContentLength.classList.add('warning-color');
      cardContentWarning = true;
    } else if (cardContentWarning) {
      cardContentLength.classList.remove('warning-color');
      cardContentWarning = false;
    }
  }
});

function showPopUpForm() {
  document.querySelector('.lock-background').classList.remove('hidden');
  popUpForm.classList.remove('hidden');
}

function hidePopUpForm() {
  popUpForm.classList.add('hidden');
  document.querySelector('.lock-background').classList.add('hidden');
  //Reset PopUpForm initial state
  popUpState = '';
  popUpTextArea = null;
  popUpInput = null;
  cardContentLength = null;
  cardContentWarning = false;
  popUpForm.querySelector('.content').innerHTML = '';
  yesOption.innerHTML = 'Yes!';
  noOption.innerHTML = 'No!';
  errorMessage.innerHTML = '';
  otherOption.classList.add('hidden');
}

popUpForm.addEventListener('submit', (e) => {
  //Prevent form from submitting
  e.preventDefault();
});

yesOption.addEventListener('click', (e) => {
  if (popUpState == 'create') {
    //Create Card
    createCard();
  } else if (popUpState == 'update') {
    //Update Card
    updateCard();
  } else if (popUpState == 'delete') {
    //Delete Card
    deleteCard();
  } else if (popUpState == 'profile') {
    //Log Out
    logout();
  }
});

noOption.addEventListener('click', (e) => {
  hidePopUpForm();
});

otherOption.addEventListener('click', (e) => {
  if (popUpState == 'profile') {
    //Delete Account
    deleteAccount();
  }
});

/* - - - - - - - - - - - - - - - - - - - - USER CONTROL - - - - - - - - - - - - - - - - - - - -  */

/* OPEN PROFILE MENU */
userProfile.addEventListener('click', () => {
  // Render Profile Menu
  popUpState = 'profile';
  popUpForm.querySelector('.content').innerHTML = '<p>Ground control to major Tom</p>';

  noOption.innerHTML = 'Back';
  yesOption.innerHTML = 'Logout';
  otherOption.innerHTML = 'Delete Account';
  otherOption.classList.remove('hidden');

  showPopUpForm();
});

/* DELETE ACCOUNT */
async function deleteAccount() {
   //Send DELETE request to the server
   let res = await fetch('/account', {
    method: 'DELETE'
  }).catch((err) => console.log(err));

  if (res.status != 200) return console.log(await res.text()); //If there is any error in the fetch we log it.
  //Otherwise logout
  logout();
}

/* LOG OUT */
function logout(){
  window.location = '/auth/logout';
}

/* - - - - - - - - - - - - - - - - - - - - CRUD operations on cards - - - - - - - - - - - - - - - - - - - -  */

/* CREATE CARDS */
createCardIcon.addEventListener('click', () => {
  //Set PopUpForm to CREATE
  popUpState = 'create';
  renderCardForm();
});

async function createCard() {
  //Get values from the form
  const name = popUpForm.querySelector('input').value;
  const content = popUpForm.querySelector('textarea').value;

  //Validate input
  let error = validateContent(name, content);
  if (error) return (errorMessage.innerHTML = error);

  //Get positional value of new card
  let lastCard = todoBoard.lastElementChild;
  let pos = 0;
  if (lastCard) {
    console.log(lastCard);
    pos = lastCard.dataset.position + 1;
  }

  //Add card to database
  let data = {
    name: name,
    content: content,
    stage: 0,
    position: pos,
  };

  //Send POST request to the server
  let res = await fetch('/cards', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-type': 'application/json; charset=UTF-8' },
  }).catch((err) => console.log(err));

  //If there is any error in the response we log it.
  if (res.status != 200) return (errorMessage.innerHTML = await res.text());
  //Otherwise store the id of our newly created card
  let card_id = await res.text()
  console.log(`Card with id ${card_id} was created`);

  //Append card in TODO board
  const card = document.createElement('div');
  renderCard(card, name, card_id);

  //Set view to current card
  slider.scrollLeft = todoBoard.offsetLeft;

  //Initialise card:
  initialiseCard(card_id, name, content, 0, pos);

  //Clear out form:
  //popUpForm.querySelector('input').value = '';
  //popUpForm.querySelector('textarea').value = '';

  //Hide pop up form
  hidePopUpForm();
}

function initialiseCard(id, name, content, stage, position) {
  cards[id] = {
    name: name,
    content: content,
    stage: stage,
    position: position,
  };

  let card = document.getElementById(id);

  //Add event listeners
  card.addEventListener('dragstart', () => {
    dragging = true;
    currentCard = id;
    toggleNavBar(0);
    card.classList.add('dragging');
    deleteCardIcon.classList.remove('hidden');
  });

  card.addEventListener('dragend', () => {
    dragging = false;
    //Update Card Stage & Position
    evaluateCardPosition(card.id, card.parentElement.id);

    //Reset UI state
    toggleNavBar(1);
    card.classList.remove('dragging');
    deleteCardIcon.classList.add('hidden');
  });

  card.addEventListener('click', (e) => {
    //Save id for later
    currentCard = id;
    //Set PopUpForm to UPDATE & Render update menu.
    popUpState = 'update';
    renderCardForm();
  });

  setCardStageClass(card, stage);
}

/* READ CARDS */
async function getAllCards() {
  //Send GET request to the server
  let res = await fetch('/cards').catch((err) => console.log(err));
  if (res.status != 200) return console.log('ERROR poor ERROR'); //If there is any error in the fetch we log it.

  cards = await res.json();

  for (let id in cards) {
    //Initialise each card
    if (cards.hasOwnProperty(id)) {
      initialiseCard(
        id,
        cards[id].name,
        cards[id].content,
        cards[id].stage,
        cards[id].position
      );
    }
  }
}

/* UPDATE CARDS */
async function updateCard() {
  let card = document.getElementById(currentCard);

  //Get updated values from the form
  const name = popUpForm.querySelector('input').value;
  const content = popUpForm.querySelector('textarea').value;

  //Validate input
  let error = validateContent(name, content);
  if (error) return (errorMessage.innerHTML = error);

  //Add card to database
  let data = {
    id: currentCard,
    name: name,
    content: content,
  };

  //Send PUT request to the server
  let res = await fetch('/cards', {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: { 'Content-type': 'application/json; charset=UTF-8' },
  }).catch((err) => console.log(err));

  //If there is any error in the response we log it.
  if (res.status != 200) return (errorMessage.innerHTML = await res.text());
  let success = await res.text()
  console.log(`Card with id ${success} was updated`);

  //Update card in our in-memory array
  cards[currentCard].name = name;
  cards[currentCard].content = content;
  //Refresh frontend
  card.innerHTML = name;
  //Reset temporary variables
  currentCard = null;

  //Hide pop up form
  hidePopUpForm();
}

function evaluateCardPosition(card_id, board_id) {
  let card = document.getElementById(card_id);
  let card_stage = getBoardValue(board_id);
  let card_pos = 0.0;

  //Get card siblings
  let cardBefore = card.previousElementSibling;
  let cardAfter = card.nextElementSibling;

  //Compare position with siblings
  if (cardBefore && cardAfter) {
    //Card has been moved between two cards. Set position to sibling's average.
    let before_pos = parseFloat(cardBefore.dataset.position);
    let after_pos = parseFloat(cardAfter.dataset.position);
    let precision = 1;
    card_pos = before_pos; 
    
    //Calculate the average value that needs less precision
    while(card_pos <= before_pos || card_pos >= after_pos){
      //Reset position
      card_pos = 0;
      //Calculate average
      card_pos += before_pos;
      card_pos += after_pos;
      card_pos *= 0.5;
      //Round result
      card_pos = Number.parseFloat(card_pos).toFixed(precision);
      //Increase precision for next round
      precision++;
    }

    /*  */
  } else if (cardBefore && !cardAfter) {
    //Card has been moved at the bottom of a list. Set position greater than sibling.
    card_pos = parseFloat(cardBefore.dataset.position) + 1;
  } else if (!cardBefore && cardAfter) {
    //Card has been moved at the top of a list. Set position smaller than sibling.
    card_pos = parseFloat(cardAfter.dataset.position) - 1;
  }

  //If the decimals of a card get too long, reset all card's positions of that board.
  if (card_pos.toString().length > 15) {
    resetCardsPositions(card.parentElement);
  } else {
    //Otherwise update only this card's position in the database
    updateCardPosition(card, card_id, card_stage, card_pos);
  }
}

async function updateCardPosition(card, card_id, card_stage, card_pos) {
  //Update card position in the client
  card.dataset.position = card_pos;
  cards[card_id].position = card_pos;
  cards[card_id].stage = card_stage;
  setCardStageClass(card, card_stage);

  //Update card position in the server
  let data = {
    id: card_id,
    stage: card_stage,
    position: card_pos,
  };

  //Send PUT request to the server
  let res = await fetch('/cards/position', {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: { 'Content-type': 'application/json; charset=UTF-8' },
  }).catch((err) => console.log(err));

  //If there is any error in the response we log it.
  if (res.status != 200) return console.log(await res.text());
}

function setCardStageClass(card, stage) {
  if (stage == 2) {
    card.classList.remove('todo');
    card.classList.remove('progress');
    card.classList.add('done');
  } else if (stage == 1) {
    card.classList.remove('todo');
    card.classList.add('progress');
    card.classList.remove('done');
  } else {
    card.classList.add('todo');
    card.classList.remove('progress');
    card.classList.remove('done');
  }
}

function resetCardsPositions(board) {
  let stage = getBoardValue(board.id);
  let cards = board.querySelectorAll('.board-item');
  for (let i = 0; i < cards.length; i++) {
    let card = document.getElementById(cards[i].id);
    updateCardPosition(card, card.id, stage, i);
  }
}

function getBoardValue(board_id) {
  let stage = 0;

  switch (board_id) {
    case 'todo-board':
      break;
    case 'progress-board':
      stage = 1;
      break;
    case 'done-board':
      stage = 2;
  }

  return stage;
}

/* DELETE CARDS */
navBar.addEventListener('dragover', (e) => {
  e.preventDefault();
});

navBar.addEventListener('dragenter', (e) => {
  navBar.classList.add('nav-bar-expand');
});

navBar.addEventListener('dragleave', (e) => {
  navBar.classList.remove('nav-bar-expand');
});

navBar.addEventListener('drop', (e) => {
  // Return navbar to its initial look
  navBar.classList.remove('nav-bar-expand');
  //Set PopUpForm to DELETE
  popUpState = 'delete';
  // Render Delete Menu
  popUpForm.querySelector('.content').innerHTML =
    "<p>Are you sure you wan't to delete that card?</p>";
  showPopUpForm();
});

async function deleteCard() {
  //Remove card from array
  delete cards[currentCard];

  //Remove card element
  document.getElementById(currentCard).remove();

  //Add card to database
  let data = {
    id: currentCard,
  };

  //Send DELETE request to the server
  let res = await fetch('/cards', {
    method: 'DELETE',
    body: JSON.stringify(data),
    headers: { 'Content-type': 'application/json; charset=UTF-8' },
  }).catch((err) => console.log(err));

  if (res.status != 200) return console.log(await res.text()); //If there is any error in the fetch we log it.
  //Otherwise store the id of our newly created card
  let success = await res.text()
  console.log(`Card with id ${success} was deleted`);

  //Reset temporary variables
  currentCard = null;

  //Hide pop up form
  hidePopUpForm();
}

/* - - - - - - - - - - - - - - - - - - - - VALIDATION functions - - - - - - - - - - - - - - - - - - - -  */
function validateContent(card_name, card_content) {
  let error = false;

  if (card_name == null || card_name == '') {
    error = 'Name is required.';
  } else if (card_name.length > 20) {
    error = 'Name cannot exceed 20 characters.';
  } else if (!card_name.match(/^[a-z0-9\s]+$/i)){
    error = "Name's characters must be alphanumeric or spaces.";
  } else if (card_content.length > 250) {
    error = 'Content cannot exceed 250 characters.';
  }

  return error;
}

/* - - - - - - - - - - - - - - - - - - - - RENDER functions - - - - - - - - - - - - - - - - - - - -  */

function renderCard(card, card_name, card_id) {
  //Create element
  card.classList.add('board-item');
  card.draggable = true;
  card.innerHTML = card_name;

  //Add unique identifier
  card.id = card_id;

  //Append to TO DO board
  todoBoard.appendChild(card);

  //Add position property to card
  let cardBefore = card.previousElementSibling;
  if (cardBefore) {
    card.dataset.position = parseFloat(cardBefore.dataset.position) + 1;
  } else {
    card.dataset.position = 0.0;
  }

  //Scroll TO DO board to focus added card
  todoBoard.scrollTop = card.offsetTop;
}

function renderCardForm() {
  popUpForm.querySelector('.content').innerHTML = `
  <div>
    <label for="">Name</label>
    <input type="text" id="card-name" autocomplete="off"/>
  </div>
  <div>
    <label for="">Content</label>
    <textarea id="card-content" cols="20" rows="6" autocomplete="off"></textarea>
    <p id="card-content-length">0/250</p>
  </div>
  `;

  popUpTextArea = document.querySelector('#card-content');
  popUpInput = document.querySelector('#card-name');
  cardContentLength = document.querySelector('#card-content-length');

  noOption.innerHTML = 'Cancel';

  if (popUpState == 'update' && currentCard != null) {
    //Replace content of the update menu with card name & content.
    popUpForm.querySelector('input').value = cards[currentCard].name;
    popUpForm.querySelector('textarea').value = cards[currentCard].content;
    //Update card content length to reflects real length
    cardContentLength.innerHTML = `${cards[currentCard].content.length}/255`;
    //Name yes option appropiately
    yesOption.innerHTML = 'Update';
  } else {
    yesOption.innerHTML = 'Create';
  }

  showPopUpForm();
}
