window.history.pushState = (function (nativePushState) {
  return function () {
    nativePushState.apply(this, arguments);
    setTimeout(()=>{
      window.dispatchEvent(new CustomEvent("state-changed"));
    }, 2000)
  };
})(window.history.pushState);
