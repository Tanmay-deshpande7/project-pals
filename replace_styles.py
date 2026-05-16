import os
import glob

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replacements Map
    rules = {
        "text-white": "text-main",
        "text-slate-400": "text-muted",
        "text-slate-500": "text-muted/70",
        "bg-[#0B0B15]": "bg-background",
        "bg-[#1A1A2E]": "bg-surface",
        "border-white/10": "border-divider-strong",
        "border-white/5": "border-divider",
        "border-black/5": "border-divider",
        "bg-white/5": "bg-glass",
        "bg-white/10": "bg-glass hover:brightness-110",
        "bg-glass": "bg-glass", # No change, but it references the internal var
    }

    # Execute replacements
    for old_txt, new_txt in rules.items():
        content = content.replace(old_txt, new_txt)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    directory = "public/js"
    # Find all JS/JSX files
    files = glob.glob(f"{directory}/**/*.js", recursive=True) + \
            glob.glob(f"{directory}/**/*.jsx", recursive=True)
            
    for f in files:
        if "dist" not in f:
            print(f"Refactoring {f}...")
            replace_in_file(f)
            
if __name__ == "__main__":
    main()
