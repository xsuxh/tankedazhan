// 输入管理：键盘 + 鼠标
class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.mouse = { x: 0, y: 0, down: false };
    this._bind();
  }
  _bind() {
    window.addEventListener('keydown', (e) => { this.keys[e.code] = true; if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault(); });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    this.canvas.addEventListener('mousemove', (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
    });
    this.canvas.addEventListener('mousedown', (e) => { if (e.button === 0) this.mouse.down = true; });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.down = false; });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  isDown(code) { return !!this.keys[code]; }
  // 边沿触发：按下瞬间返回 true 一次
  pressed(code) {
    if (this.keys[code] && !this._prev[code]) { this._prev[code] = true; return true; }
    if (!this.keys[code]) this._prev[code] = false;
    return false;
  }
  _prev = {};
  consumePressed(code) { return this.pressed(code); }
}
window.Input = Input;
