AFRAME.registerComponent('start-experience', {
    init: function () {
        console.log('scene loaded');
        document.querySelector('#menu-overlay').style.display = 'block';
    }
});