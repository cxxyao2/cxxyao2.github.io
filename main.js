const collapsibles = document.querySelectorAll('.collapsible');
collapsibles.forEach((item) =>
  item.addEventListener('click', function () {
    this.classList.toggle('collapsible-expanded');
  })
);

const backToTop = document.getElementById('backToTop');
backToTop.addEventListener('click', function () {
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;
});

window.addEventListener('scroll', function () {
  if (window.scrollY > 20) {
    backToTop.style.display = 'inline-block';
  } else {
    backToTop.style.display = 'none';
  }
});
