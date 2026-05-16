import os
import glob
import re

def fix_orbs(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # We want to find bg-primary/20 inside divs that have blur-[...]
    # Instead of parsing HTML, let's just find any bg-(primary|secondary|accent)/(\d+) and 
    # check if the word "blur" is on the same line.
    
    lines = content.split('\n')
    modified = False
    
    for i, line in enumerate(lines):
        if "blur-[" in line and "bg-" in line:
            # find all bg-COLOR/OPACITY combinations
            matches = re.finditer(r'bg-(primary|secondary|accent)/(\d+)', line)
            for match in matches:
                color = match.group(1)
                original_opacity = int(match.group(2))
                
                # Boost light mode opacity significantly (max 50)
                light_opacity = min(50, original_opacity + 30)
                
                original_class = f"bg-{color}/{original_opacity}"
                new_class = f"bg-{color}/{light_opacity} dark:{original_class}"
                
                # Careful not to infinitely replace if we run this script twice
                if f"dark:{original_class}" not in line:
                    line = line.replace(original_class, new_class)
                    modified = True
            
            lines[i] = line

    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
        print(f"Restored glowing orbs in {filepath}")

def main():
    directory = "public/js"
    # Find all JS/JSX files
    files = glob.glob(f"{directory}/**/*.js", recursive=True) + \
            glob.glob(f"{directory}/**/*.jsx", recursive=True)
            
    for f in files:
        if "dist" not in f:
            fix_orbs(f)
            
if __name__ == "__main__":
    main()
