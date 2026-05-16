const Logo = ({ size = 'md', showText = false, textClassName = "", className = "" }) => {
    const sizeConfig = {
        sm: { box: "w-8 h-8 rounded-lg", icon: 18 },
        md: { box: "w-10 h-10 rounded-xl", icon: 24 },
        lg: { box: "w-12 h-12 rounded-xl", icon: 24 }
    };

    const { box, icon } = sizeConfig[size] || sizeConfig.md;

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div className={`${box} bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30`}>
                <Icon name="layers" size={icon} className="text-main" />
            </div>
            {showText && <span className={`font-bold tracking-tight text-main ${textClassName}`}>ProjectPals</span>}
        </div>
    );
};

window.Logo = Logo;
