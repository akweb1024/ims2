import zipfile, xml.etree.ElementTree as ET, sys, os

def get_docx_text(path):
    try:
        with zipfile.ZipFile(path) as docx:
            tree = ET.XML(docx.read('word/document.xml'))
        text = []
        for paragraph in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
            texts = [node.text for node in paragraph.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if node.text]
            if texts:
                text.append(''.join(texts))
        return '\n'.join(text)
    except Exception as e:
        return str(e)

docs = [
    "11_Performance_Management_System_PMS.docx",
    "9_Compensation_Philosophy_and_CTC_Design.docx",
    "10_Variable_Pay_Incentives_and_Bonus_Policy.docx",
    "8_Onboarding_and_Probation_Management.docx",
    "23_ITBREAKCOM_Separation_Exit_FnF_SOP.docx"
]

base_dir = '/mnt/ssd_storage/ims 12 feb/mydata/HR Policies ITBREAK Final'
for d in docs:
    p = os.path.join(base_dir, d)
    print(f"--- {d} ---")
    print(get_docx_text(p)[:2000] + "...\n")

