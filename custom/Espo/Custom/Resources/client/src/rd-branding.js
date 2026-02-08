define('custom:rd-branding', [], function () {
    var applyLogoSize = function () {
        if (!window.Espo || !Espo.config) {
            return;
        }

        var getValue = Espo.config.get
            ? Espo.config.get.bind(Espo.config)
            : function (key) {
                return Espo.config[key];
            };

        var width = getValue('logoWidth');
        var height = getValue('logoHeight');

        if (width) {
            document.documentElement.style.setProperty('--rd-logo-width', width + 'px');
        }
        if (height) {
            document.documentElement.style.setProperty('--rd-logo-height', height + 'px');
        }
    };

    if (window.Espo && Espo.on) {
        Espo.on('ready', applyLogoSize);
    } else {
        document.addEventListener('DOMContentLoaded', applyLogoSize);
    }

    return {};
});
