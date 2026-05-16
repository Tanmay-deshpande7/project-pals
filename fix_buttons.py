import os
import glob
import re

def fix_button_text(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    modified = False
    for i, line in enumerate(lines):
        if any(bg in line for bg in ["bg-primary", "bg-secondary", "bg-accent", "bg-gradient-to-r"]):
            if "text-main" in line:
                lines[i] = line.replace("text-main", "text-white")
                modified = True
        
        # also check for tabs/text-white overrides
        if "text-glow" in line and "text-main" in line:
             lines[i] = line.replace("text-main", "text-white")
             modified = True

    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print(f"Fixed button text in {filepath}")

def main():
    directory = "public/js"
    # Find all JS/JSX files
    files = glob.glob(f"{directory}/**/*.js", recursive=True) + \
            glob.glob(f"{directory}/**/*.jsx", recursive=True)
            
    for f in files:
        if "dist" not in f:
            fix_button_text(f)
            
if __name__ == "__main__":
    main()
