
import os
import re

# Find ALL route.ts files with [
all_route_files = []
for root, dirs, files in os.walk('/home/itb-09/Desktop/dp 16 jan 2025/architecture/stmCustomer/src/app/api'):
    if '[' in root:
        for file in files:
            if file == 'route.ts':
                all_route_files.append(os.path.join(root, file))

def fix_file(filepath):
    print(f"Checking: {filepath}")
    with open(filepath, 'r') as f:
        content = f.read()

    params_match = re.findall(r'\[([^\]]+)\]', filepath)
    if not params_match:
        return

    new_content = content

    for p_name in params_match:
        # Fix the signature to use destructuring { params }
        # Pattern matches both with and without 'user: any'
        sig_pattern = rf'async\s*\(req:\s*NextRequest,\s*(user:?\s*[^,]+)?,\s*context:\s*\{{\s*params:\s*Promise<\{{\s*{p_name}:\s*string\s*\}}>\s*\}}\)'
        
        def sig_repl(match):
            user_part = match.group(1) or 'user: any'
            return f'async (req: NextRequest, {user_part}, {{ params }}: {{ params: Promise<{{ {p_name}: string }}> }})'
            
        new_content = re.sub(sig_pattern, sig_repl, new_content)

        # Fix the body: if we use { params } in sig, we must use params in body
        # await context.params -> await params
        new_content = new_content.replace('await context.params', 'await params')
        
        # Remove triple declarations if any
        triple_pattern = rf'const\s*\{{\s*{p_name}\s*\}}\s*=\s*await\s*params;\s+const\s*\{{\s*{p_name}\s*\}}\s*=\s*await\s*params;'
        new_content = re.sub(triple_pattern, f'const {{ {p_name} }} = await params;', new_content)

    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Fixed!")
    else:
        print(f"No changes.")

for f in all_route_files:
    fix_file(f)
