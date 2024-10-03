const detailsShowBtn = document.querySelector(".details--btn");
const detailsPopUp = document.querySelector(".details--popUp");
const outerScreen = document.querySelector(".outerScreen");

detailsShowBtn.addEventListener("click", (e) => {
  e.preventDefault();
  detailsPopUp.classList.toggle("hidden");
  outerScreen.classList.toggle("hidden");
});
