/**
 * Designer Skill - Layout Generation Script
 * Provides complex UI layout generation for WebScreenshots Pro 3D.
 */

export function generateBottomStack(DesignAPI) {
    DesignAPI.clearElements();
    DesignAPI.addScreen({ color: 'transparent' });
    DesignAPI.addScreen({ color: 'transparent' });
    DesignAPI.addScreen({ color: 'transparent' });

    // Main device tilted
    DesignAPI.add3DDevice({
        x: 400, y: 550, scale: 0.9, rotX: 10, rotY: -20, rotZ: 0,
        frameColor: '#ffffff', imageKey: 'main_ui'
    });

    // Side device smaller
    DesignAPI.add3DDevice({
        x: 150, y: 650, scale: 0.7, rotX: 5, rotY: 45, rotZ: 5,
        opacity: 0.6, frameColor: '#f1f5f9', imageKey: 'side_ui'
    });

    DesignAPI.addText({
        text: 'Elegance Redefined',
        x: 400, y: 150, fontSize: 56, textAlign: 'center', fontWeight: '800'
    });
}

export function generateMinimalHero(DesignAPI) {
    DesignAPI.clearElements();
    DesignAPI.setBackground({ type: 'solid', color: '#ffffff' });
    
    DesignAPI.addText({
        text: 'PRO',
        x: 400, y: 100, fontSize: 120, opacity: 0.05, fontWeight: '900', textAlign: 'center'
    });

    DesignAPI.add3DDevice({
        x: 400, y: 480, scale: 1.0, rotX: 0, rotY: 0, rotZ: 0,
        frameColor: '#000000', imageKey: 'hero_ui'
    });

    DesignAPI.addText({
        text: 'Minimum Effort. Maximum Style.',
        x: 400, y: 800, fontSize: 32, textAlign: 'center', opacity: 0.6
    });
}
