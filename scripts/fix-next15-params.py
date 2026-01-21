
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
        # Correct authorizedRoute pattern: it has (req, user, { params })
        # We need to change it to (req, user, { params }: { params: Promise<{ id: string }> })
        
        # 1. Match the pattern where context was used (from my previous wrong fix)
        wrong_auth = rf'async\s*\(req:\s*NextRequest,\s*context:\s*\{{\s*params:\s*Promise<\{{\s*{p_name}:\s*string\s*\}}>\s*\}}\)\s*=>'
        correct_auth = f'async (req: NextRequest, user: any, {{ params }}: {{ params: Promise<{{ {p_name}: string }}> }}) =>'
        new_content = re.sub(wrong_auth, correct_auth, new_content)

        # 2. Match standard pattern that might still exist
        pattern_auth = rf'async\s*\(req:\s*NextRequest,\s*user,\s*\{{\s*params\s*\}}:\s*\{{\s*params:\s*\{{\s*{p_name}:\s*string\s*\}}\s*\}}\)\s*=>'
        new_content = re.sub(pattern_auth, correct_auth, new_content)
        
        # 3. Handle 'const params = await context.params;' (from my previous wrong fix)
        new_content = new_content.replace('const params = await context.params;', f'const {{ {p_name} }} = await params;')
        new_content = new_content.replace('const { id: courseId } = params;', 'const courseId = id;') # Specific fix for courses

        # 4. Usage pattern
        new_content = new_content.replace(f'const {p_name} = params.{p_name};', f'const {{ {p_name} }} = await params;')
        new_content = new_content.replace(f'const {{ {p_name} }} = params;', f'const {{ {p_name} }} = await params;')

    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Fixed!")
    else:
        print(f"No changes.")

for f in all_route_files:
    fix_file(f)
