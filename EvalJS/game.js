document.addEventListener('DOMContentLoaded', function() {
  let startButton = document.getElementById('startButton');
  let timeDisplay = document.getElementById('timeDisplay');
  let gameBoard = document.getElementById('gameBoard');

  // Create 4x4 squares
  for (let i = 0; i < 16; i++) {
      let square = document.createElement('div');
      square.className = 'square';
      gameBoard.appendChild(square);
  }

  let squares = document.getElementsByClassName('square');
  let litSquare = null;
  let startTime = null;

  startButton.addEventListener('click', function() {
      startTime = new Date();
      lightUpSquare();
  });

  function lightUpSquare() {
      if (litSquare) {
          litSquare.style.backgroundColor = '';
      }

      let randomIndex = Math.floor(Math.random() * squares.length);
      litSquare = squares[randomIndex];
      litSquare.style.backgroundColor = 'green';

      setTimeout(lightUpSquare, Math.random() * 2500 + 500); 
  }

  gameBoard.addEventListener('click', function(event) {
      if (event.target.className === 'square' && event.target === litSquare) {
          let endTime = new Date();
          let timeTaken = (endTime - startTime) / 1000;
          timeDisplay.textContent = 'Time taken: ' + timeTaken.toFixed(2) + ' seconds';
          startTime = null;
      }
  });
});
