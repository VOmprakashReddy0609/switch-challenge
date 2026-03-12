//timer.js
let timerInterval
let timeRemaining=300

function startTimer(){

timerInterval=setInterval(()=>{

timeRemaining--

document.getElementById("timer").textContent=timeRemaining

if(timeRemaining<=0){

clearInterval(timerInterval)
endGame()

}

},1000)

}