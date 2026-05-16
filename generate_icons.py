import os

def create_svg(filename, content):
    with open(filename, 'w') as f:
        f.write(content)

# Colors
primary = "#8B5CF6"
secondary = "#3B82F6"
accent = "#F472B6"

# Styles
glow = f"""
<defs>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:{primary};stop-opacity:1" />
        <stop offset="100%" style="stop-color:{secondary};stop-opacity:1" />
    </linearGradient>
</defs>
"""

# Icons
icons = {
    "logo": f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        {glow}
        <polygon points="12 2 2 7 12 12 22 7 12 2" filter="url(#glow)" />
        <polyline points="2 17 12 22 22 17" filter="url(#glow)" />
        <polyline points="2 12 12 17 22 12" filter="url(#glow)" />
    </svg>""",
    
    "dashboard": f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        {glow}
        <rect x="3" y="3" width="7" height="7" filter="url(#glow)"/>
        <rect x="14" y="3" width="7" height="7" filter="url(#glow)"/>
        <rect x="14" y="14" width="7" height="7" filter="url(#glow)"/>
        <rect x="3" y="14" width="7" height="7" filter="url(#glow)"/>
    </svg>""",
    
    "projects": f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{secondary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        {glow}
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" filter="url(#glow)"/>
    </svg>""",
    
    "messages": f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{primary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        {glow}
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" filter="url(#glow)"/>
    </svg>""",
    
    "settings": f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        {glow}
        <circle cx="12" cy="12" r="3" filter="url(#glow)"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" filter="url(#glow)"/>
    </svg>""",

    "plus": f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.2)" stroke="none" />
        <path d="M12 8v8M8 12h8" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>""",
    
    "explore": f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        {glow}
        <circle cx="12" cy="12" r="10" filter="url(#glow)"/>
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="rgba(255, 215, 0, 0.2)" />
    </svg>""",

    "ghost": f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        {glow}
        <path d="M9 22a7 7 0 0 1-7-7V9a7 7 0 0 1 14 0v6a7 7 0 0 1-7 7z" filter="url(#glow)"/>
        <path d="M9 22v-1" filter="url(#glow)"/>
        <path d="M15 9h.01" stroke="white" stroke-width="3" filter="url(#glow)"/>
        <path d="M10 9h.01" stroke="white" stroke-width="3" filter="url(#glow)"/>
        <path d="M12 16a3 3 0 0 0 3-3" filter="url(#glow)"/>
    </svg>""",

    "user": f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{primary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        {glow}
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" filter="url(#glow)"/>
        <circle cx="12" cy="7" r="4" filter="url(#glow)"/>
    </svg>""",
    
    "sliders": f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{secondary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        {glow}
        <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" filter="url(#glow)" />
    </svg>""",
    
    "shield": f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        {glow}
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" filter="url(#glow)"/>
    </svg>""",
    
    "trash-2": f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        {glow}
        <polyline points="3 6 5 6 21 6" filter="url(#glow)"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" filter="url(#glow)" />
        <line x1="10" y1="11" x2="10" y2="17" filter="url(#glow)" />
        <line x1="14" y1="11" x2="14" y2="17" filter="url(#glow)" />
    </svg>""",
    
    "google": f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>"""
}

output_dir = "d:/project pals/public/assets/icons"
os.makedirs(output_dir, exist_ok=True)

for name, content in icons.items():
    create_svg(os.path.join(output_dir, f"{name}.svg"), content)
    print(f"Generated {name}.svg")
