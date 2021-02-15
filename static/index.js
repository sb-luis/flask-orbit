let authForm = document.querySelector('form');
let content = document.querySelector('.content');
let menuOptions = document.querySelector('.menu-options');
let message = document.querySelector('#form-message')

document.querySelector('.login').addEventListener('click', () => {
    authenticate('login');
});

document.querySelector('.register').addEventListener('click', () => {
    authenticate('register');
});

authForm.addEventListener('submit', (e) => {
  e.preventDefault();
});

async function authenticate(route){
  //Get values from the form
  const _name = authForm.querySelector('#name').value;
  const _password = authForm.querySelector('#password').value;

  //Validate input
  const error =  validateInput(_name, _password);
  if(error) return;

  //Fetch 
  let data = {
    name: _name,
    password: _password,
  };

  let res = await fetch(`/auth/${route}`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-type': 'application/json; charset=UTF-8' },
  }).catch((err) => console.log(err));

  if (res.status != 200) console.log(await res.text()); //If there is any error in the fetch we log it.
  
  let dialog = await res.json();

  console.log(_name, _content);
}

function validateInput(name, password){
    return false;
}