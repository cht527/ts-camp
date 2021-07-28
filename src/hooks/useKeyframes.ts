export default function useKeyframes() {
    const style = document.createElement('style');
    const progress = `
      @keyframes progress {
        0% {
          width: 0;
        }
        100% {
          width: 100%;
        }
      }`;
    style.innerHTML = progress;
    document.getElementsByTagName('head')[0].appendChild(style);
}