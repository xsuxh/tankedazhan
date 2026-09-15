// 入口
window.addEventListener('load', () => {
  const game = new Game();
  window.__game = game;
  game.ui.showMenu();
});
