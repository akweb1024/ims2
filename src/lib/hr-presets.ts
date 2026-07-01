export const HR_PRESETS = [
    {
        title: 'Offer Letter',
        type: 'OFFER_LETTER',
        content: `
<h1>Offer of Employment</h1>
<p>Date: {{date}}</p>
<p>To,</p>
<h3>{{name}}</h3>
<p>{{address}}</p>

<p>Dear <strong>{{name}}</strong>,</p>

<p>We are pleased to offer you the position of <strong>{{designation}}</strong> at <strong>{{companyName}}</strong>. We were impressed with your qualifications and believe you will be a valuable asset to our team.</p>

<h3>Compensation and Benefits</h3>
<p>Your annual cost to company (CTC) will be <strong>{{salary}}</strong>. A detailed breakdown of your salary structure is attached to this letter.</p>

<h3>Date of Joining</h3>
<p>You are expected to join on or before <strong>{{joiningDate}}</strong>. Please report to the HR department at 10:00 AM on your joining date.</p>

<h3>Terms and Conditions</h3>
<ul>
    <li>This offer is subject to satisfactory reference checks and verification of documents.</li>
    <li>You will be on probation for a period of 6 months.</li>
    <li>You are required to submit copies of your educational and professional certificates on the day of joining.</li>
</ul>

<p>We look forward to welcoming you to the <strong>{{companyName}}</strong> family.</p>

<p>Sincerely,</p>
<p><strong>HR Manager</strong></p>
<p>{{companyName}}</p>
<br>
<hr>
<p><strong>Acceptance of Offer</strong></p>
<p>I, <strong>{{name}}</strong>, accept the offer of employment on the terms and conditions mentioned above.</p>
        `
    },
    {
        title: 'Appointment Letter',
        type: 'CONTRACT',
        content: `
<p><strong>Private &amp; Confidential</strong></p>
<p><strong>{{name}}</strong><br>{{address}}<br>Mob: {{phone}} &nbsp; Email: {{email}}</p>
<p>Dated: {{date}}</p>
<h2>Subject: Letter of Appointment</h2>
<p>Dear {{name}},</p>
<p>Congratulations and welcome to <strong>{{companyName}}</strong>. With reference to your application and subsequent interview, we are pleased to offer you an appointment in the service of the company as <strong>{{designation}}</strong> under a service contract with the following terms and conditions. We are confident that you will meet the responsibilities of the position with the same enthusiasm and enterprise you have exhibited.</p>
<p>1. Your Cost to the Company (CTC) would be <strong>{{ctcAnnual}} per annum</strong> which includes perks, ESI &amp; provident fund etc. The structure of your compensation may be changed from time to time in line with the Company's compensation policy. Your compensation details are confidential and should be discussed only with your reporting manager or the HR Department.</p>
<p>2. Your appointment shall come into effect from the date of your joining <strong>{{companyName}}</strong> and shall initially be for a period of two years (including three months probation) or the project allocated (whichever is earlier), extendable as mutually agreed. You will devote your whole working time and work faithfully, sincerely, diligently and efficiently in the development of the company.</p>
<p>3. After your probation period, you may resign by giving 30 days prior written notice. During probation, the company may ask you to resign or terminate your services without notice or assigning any reason.</p>
<p>4. After successful completion of probation, the company may terminate this appointment by giving one month's prior notice or one month's salary in lieu thereof. In case of breach of any term, commission of any criminal offence, or absence from duty for more than a week without permission, the company may terminate the appointment without the stipulated notice.</p>
<p>5. You may be liable to be transferred to any office or department of the Company or its associate / group companies, whether existing or to be set up, anywhere in India or abroad, at the sole discretion of management, on the same terms and conditions of employment.</p>
<p>6. You may be required to sign a separate service agreement if you are sent for any specialized training required for upgradation of your skills and knowledge.</p>
<p>7. During your employment you will not participate or be engaged, directly or indirectly, in any other occupation or advisory role of any kind without the prior written approval of the competent authority.</p>
<p>8. You will not engage in any studies or professional courses without prior written permission, which will be at the sole discretion of the company.</p>
<p>9. You will treat all information relating to the affairs of the company as secret and confidential and prevent its disclosure. You will not use such information for personal or commercial gains. This provision will apply for three years even after termination of your appointment.</p>
<p>10. You will not seek employment with any organization with whom contact has been developed as a result of your professional dealings.</p>
<p>11. Any change in your residential address, civil/marital status or qualification after your application should be notified in writing within three days to the company.</p>
<p>12. Salary reviews are linked to your performance and will be the basis for your future promotion/growth, evaluated periodically as part of our appraisal procedure.</p>
<p>13. You shall not carry on any business or be employed by any other firm, company or individual, in any capacity, without the prior written permission of the competent authority.</p>
<p>14. During your employment you will be governed by the service rules and regulations / procedure manual and such other circulars as may be in force or amended from time to time.</p>
<p>15. All Intellectual Property Rights arising out of your work / research shall be of single ownership belonging to <strong>{{companyName}}</strong>. You warrant that IPR generated by your work is legally and beneficially owned by the company and does not infringe any third-party rights.</p>
<p>16. Dereliction of duty, non-adherence to assigned roles, non-performance, disobedience or malpractice will be considered a serious deviation from duties and may result in termination with or without intimation.</p>
<p>17. In case you are found misusing the organization's property (including mobile, internet, computer, printer etc.), the resulting costs may be recovered from your dues and the company may terminate you from service.</p>
<p>18. You have been engaged on the presumption that the particulars furnished by you are correct. If found incorrect, or if you have concealed or withheld relevant facts, your appointment shall stand terminated/cancelled without notice.</p>
<p>19. You will be retired from service on attaining the superannuation age of 58 years, or earlier if found physically/mentally unfit as certified by a medical practitioner nominated by the company.</p>
<p>20. You would initially be posted at the Company's office and are requested to report to your Reporting Manager on joining, effective <strong>{{joiningDate}}</strong>. Upon joining, you will be required to sign a standard undertaking to conform to organizational discipline, policies and norms.</p>
<h3>Undertaking</h3>
<p>I hereby undertake to give one month's notice or surrender one month's salary in case I wish to leave the organization. After leaving, I undertake not to take employment in any competitive organization where the trainings, knowledge, key information and trade secrets of {{companyName}} can be used against it, for a period of three years. It is clearly understood that it is mandatory to obtain a No Dues Certificate before leaving the organization.</p>
<h3>Declaration</h3>
<p>I, {{name}}, hereby declare that I have understood this Letter of Appointment and agree to abide by its clauses. All required documents will be submitted on the date of joining. Salary will be subject to revision in case of non-submission of the required experience certificates. Non-disclosure of prior experience or non-submission of any required document will lead to termination of services.</p>
<h3>Documents to be submitted at the time of joining</h3>
<p>1. Passport size colored photographs (02 copies)<br>2. Birth Certificate / School Leaving Certificate showing date of birth<br>3. Educational certificates (10th grade onwards) along with marksheets<br>4. Appointment and Relieving Letters of previous employers<br>5. Last month's Salary Slip<br>6. Any one photo ID and address proof (Passport / Driving License / Voter ID / PAN Card / Aadhaar)<br>7. Medical Fitness Certificate from a registered medical practitioner</p>
<h3>Annexure — Salary Structure (Monthly)</h3>
<table>
<tr><th>Component</th><th>Amount (per month)</th></tr>
<tr><td>Basic + DA</td><td>{{basicSalary}}</td></tr>
<tr><td>HRA</td><td>{{hra}}</td></tr>
<tr><td>Conveyance</td><td>{{conveyance}}</td></tr>
<tr><td>Special Allowance</td><td>{{specialAllowance}}</td></tr>
<tr><td>Gross (per month)</td><td>{{grossMonthly}}</td></tr>
<tr><td>Total CTC (per annum)</td><td>{{ctcAnnual}}</td></tr>
</table>
<p>Note: Statutory bonus will be paid in accordance with the Payment of Bonus Act and company policy. Other reimbursements/benefits, if applicable, will be extended as per company policy.</p>
<p>We look forward to having you as a member of our team.</p>
<p>Yours sincerely,<br>For <strong>{{companyName}}</strong></p>
<p>Authorized Signatory &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Candidate's Signature</p>
        `
    },
    {
        title: 'Non-Disclosure Agreement (NDA)',
        type: 'NDA',
        content: `
<h1>Non-Disclosure Agreement</h1>
<p>This Non-Disclosure Agreement ("Agreement") is entered into on <strong>{{date}}</strong> between:</p>

<p><strong>{{companyName}}</strong> ("Disclosing Party")</p>
<p>AND</p>
<p><strong>{{name}}</strong> ("Receiving Party"), employed as {{designation}}.</p>

<h3>1. Definition of Confidential Information</h3>
<p>"Confidential Information" includes, but is not limited to, technical data, trade secrets, know-how, software, customer lists, financial information, and business plans disclosed by the Disclosing Party.</p>

<h3>2. Obligations of Receiving Party</h3>
<p>The Receiving Party agrees to:</p>
<ul>
    <li>Maintain the confidentiality of the information.</li>
    <li>Use the information solely for the purpose of performing their employment duties.</li>
    <li>Not disclose the information to any third party without prior written consent.</li>
</ul>

<h3>3. Duration</h3>
<p>The obligations of this Agreement shall survive the termination of employment and continue for a period of 2 years thereafter.</p>

<h3>4. Governing Law</h3>
<p>This Agreement shall be governed by the laws of India.</p>

<p><strong>IN WITNESS WHEREOF</strong>, the parties have executed this Agreement as of the date first above written.</p>
        `
    },
    {
        title: 'Experience / Relieving Letter',
        type: 'RELIEVING_LETTER',
        content: `
<p>Date: {{date}}</p>
<h3>TO WHOMSOEVER IT MAY CONCERN</h3>

<p>This is to certify that <strong>{{name}}</strong> was employed with <strong>{{companyName}}</strong> from <strong>{{joiningDate}}</strong> to {{date}}.</p>

<p>He/She held the designation of <strong>{{designation}}</strong> at the time of leaving.</p>

<p>During his/her tenure with us, we found him/her to be sincere, hardworking, and result-oriented. He/She has been relieved from his/her duties effective close of business hours on {{date}}.</p>

<p>We wish him/her all the best for future endeavors.</p>

<p>For <strong>{{companyName}}</strong>,</p>
<br><br>
<p>Authorized Signatory</p>
        `
    },
    {
        title: 'No Objection Certificate (NOC)',
        type: 'NOC',
        content: `
<h1>No Objection Certificate</h1>
<p>Date: {{date}}</p>

<p>This is to certify that <strong>{{name}}</strong> is a permanent employee of <strong>{{companyName}}</strong>, working as <strong>{{designation}}</strong> since <strong>{{joiningDate}}</strong>.</p>

<p>This certificate is issued at the request of the employee for the purpose of <strong>[Visa Application / Loan Application / Other]</strong>.</p>

<p>The company has no objection to the employee obtaining the said facility/document.</p>

<p>Sincerely,</p>
<p>HR Manager</p>
<p><strong>{{companyName}}</strong></p>
        `
    },
    {
        title: 'IT & Data Security Policy',
        type: 'POLICY',
        content: `
<h1>IT & Data Security Policy Acknowledgement</h1>
<p><strong>Employee Name:</strong> {{name}}</p>
<p><strong>Designation:</strong> {{designation}}</p>

<h3>Policy Overview</h3>
<p>This policy outlines the acceptable use of computer equipment at {{companyName}}. You must protect the confidentiality, integrity, and availability of our data.</p>

<h3>Key Guidelines</h3>
<ul>
    <li>Access to systems is for business use only.</li>
    <li>Do not share passwords or access credentials.</li>
    <li>Report any suspicious activity or security breaches immediately.</li>
    <li>Ensure all proprietary data remains within the company network.</li>
</ul>

<p>By signing below, I acknowledge that I have read and understood the IT & Data Security Policy and agree to abide by it.</p>
        `
    },
    {
        title: 'Salary Structure Annexure',
        type: 'CONTRACT',
        content: `
<h1>Annexure A: Salary Structure</h1>
<p><strong>Name:</strong> {{name}}</p>
<p><strong>Designation:</strong> {{designation}}</p>
<p><strong>Annual CTC:</strong> {{salary}}</p>

<table border="1" style="width:100%; border-collapse: collapse; text-align: left;">
    <thead>
        <tr style="background-color: #f2f2f2;">
            <th style="padding: 8px;">Component</th>
            <th style="padding: 8px;">Annual (INR)</th>
            <th style="padding: 8px;">Monthly (INR)</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td style="padding: 8px;">Basic Salary</td>
            <td style="padding: 8px;">40% of CTC</td>
            <td style="padding: 8px;">-</td>
        </tr>
        <tr>
            <td style="padding: 8px;">HRA</td>
            <td style="padding: 8px;">20% of CTC</td>
            <td style="padding: 8px;">-</td>
        </tr>
        <tr>
            <td style="padding: 8px;">Special Allowance</td>
            <td style="padding: 8px;">Balancing Figure</td>
            <td style="padding: 8px;">-</td>
        </tr>
        <tr>
            <td style="padding: 8px;"><strong>Total Gross</strong></td>
            <td style="padding: 8px;"><strong>{{salary}}</strong></td>
            <td style="padding: 8px;"><strong>-</strong></td>
        </tr>
    </tbody>
</table>
<p><em>* Professional Tax and TDS will be deducted as per applicable laws.</em></p>
        `
    },
    {
        title: 'Detailed Terms & Conditions',
        type: 'POLICY',
        content: `
<h1>Terms and Conditions of Employment</h1>

<h3>1. Working Hours</h3>
<p>The normal working hours are from 10:00 AM to 7:00 PM, Monday to Saturday. However, you may be required to work additional hours depending on business requirements.</p>

<h3>2. Leaves and Holidays</h3>
<p>You are entitled to 12 Casual Leaves and 12 Sick Leaves per annum. Public holidays will be as per the company list published every year.</p>

<h3>3. Intellectual Property</h3>
<p>Any work, invention, or creation made by you during the course of your employment shall be the sole property of {{companyName}}.</p>

<h3>4. Code of Conduct</h3>
<p>You are expected to maintain high standards of professional conduct. Any form of harassment, discrimination, or dishonesty will lead to disciplinary action, up to termination.</p>

<h3>5. Termination</h3>
<p>The company reserves the right to terminate your employment with immediate effect in case of misconduct or breach of policy.</p>

<p>I, <strong>{{name}}</strong>, have read and understood the terms above.</p>
        `
    },
    {
        title: 'Trainee / Internship Offer',
        type: 'CONTRACT',
        content: `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="text-align: right; margin-bottom: 20px;">
        <strong>PERSONAL AND CONFIDENTIAL</strong><br>
        Date: {{date}}
    </div>

    <p>To,<br>
    <strong>{{name}}</strong><br>
    {{address}}</p>

    <p><strong>Subject: Offer Letter – Trainee</strong></p>

    <p>Dear {{name}},</p>

    <p>Welcome to <strong>{{companyName}}</strong>. We are pleased to offer you a position of <strong>Trainee ({{designation}})</strong>. This training position is for a Period of Three Months, beginning from the date of joining.</p>

    <p>You will be on training/probation during this period and your continued participation in the training position will be dependent upon successful completion of courses and learning objectives as per the training plan. If you successfully complete the training program, you may be offered a permanent position as {{designation}}.</p>

    <p><strong>Stipend:</strong> Your starting Stipend will be <strong>{{salary}}</strong> per month. Upon successful completion of courses and training objectives, your training Stipend will be finalized based on your performance.</p>

    <h3>Terms of Training:</h3>
    <ul>
        <li>You intend to successfully complete the training program and stay in the target position for a period of time equal to, or greater than the length of the training program.</li>
        <li>Lack of success at any stage of the training program will be reason for removal from the position.</li>
        <li>You will take responsibility for gaining the skills required for the target position and participate in ongoing planning and evaluation.</li>
    </ul>

    <p>You can terminate your training by giving 10 working days prior notice. During probation, the company can terminate your training without notice or assigning any reasons.</p>

    <p>Please indicate your acceptance by signing a copy of this letter.</p>

    <div style="margin-top: 50px; display: flex; justify-content: space-between;">
        <div>
            <p>_________________________</p>
            <p><strong>Authorized Signatory</strong></p>
        </div>
        <div style="text-align: right;">
            <p>_________________________</p>
            <p><strong>Candidate Signature</strong></p>
        </div>
    </div>
</div>
        `
    },
    {
        title: 'Undertaking cum Indemnity (Salary Reversal)',
        type: 'POLICY',
        content: `
<div style="font-family: Times New Roman, serif; padding: 40px; line-height: 1.5;">
    <h2 style="text-align: center; text-decoration: underline;">UNDERTAKING cum INDEMNITY</h2>
    
    <p>This Undertaking cum Indemnity executed by <strong>{{companyName}}</strong>, a company having its registered office at {{companyAddress}} (hereinafter referred to as “The Company”) IN FAVOUR OF <strong>{{bankName}}</strong>.</p>

    <p><strong>WHEREAS:</strong></p>
    <ol>
        <li>Pursuant to the Corporate Salary Arrangement, the employees of the Company maintain various savings bank accounts with the Bank wherein the salaries and other dues are being credited by the Bank on instructions of the Company.</li>
        <li>The Company may inadvertently/erroneously instruct the Bank to credit into any of the accounts of employees an amount not legally due & payable.</li>
        <li>The company in such event may request the Bank to mark hold and reverse the credit.</li>
    </ol>

    <p><strong>NOW in Consideration of the premises:</strong></p>
    <p>The company hereby irrevocably and unconditionally undertakes and agrees to indemnify the Bank from and against all loss, damages, actions, suits, proceedings, claims, and expenses which the Bank may incur by reason of marking hold funds or reversing credit at the request of the company.</p>
    
    <p>I, <strong>{{name}}</strong> ({{designation}}), hereby authorize the company and the bank to act upon such instructions for reversal of erroneous credits if any.</p>

    <div style="margin-top: 40px; border-top: 1px solid #000; padding-top: 10px;">
        <p><strong>Dated:</strong> {{date}}</p>
        <p><strong>Employee Name:</strong> {{name}}</p>
        <p><strong>Employee ID:</strong> {{employeeId}}</p>
    </div>
</div>
        `
    },
    {
        title: 'Formal Relieving Letter',
        type: 'RELIEVING_LETTER',
        content: `
<div style="font-family: Arial, sans-serif; padding: 30px;">
    <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="margin: 0;">{{companyName}}</h1>
        <p style="margin: 0; color: #666;">{{companyAddress}}</p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
        <div>Date: {{date}}</div>
        <div>Ref: {{companyName}}/REL/{{year}}</div>
    </div>

    <h2 style="text-align: center; text-decoration: underline;">TO WHOMSOEVER IT MAY CONCERN</h2>

    <p style="margin-top: 30px;">This is to certify that <strong>{{name}}</strong> was employed with <strong>{{companyName}}</strong> from <strong>{{joiningDate}}</strong> to <strong>{{relievingDate}}</strong>.</p>

    <p>He/She held the designation of <strong>{{designation}}</strong> at the time of leaving. During his/her tenure with us, we found him/her to be sincere, hardworking, and result-oriented.</p>

    <p>He/She has been relieved from his/her duties effective close of business hours on <strong>{{relievingDate}}</strong>. His/her conduct during the period of employment was good.</p>

    <p>We wish <strong>{{name}}</strong> all the best for future endeavors.</p>

    <div style="margin-top: 60px;">
        <p>For <strong>{{companyName}}</strong>,</p>
        <br><br>
        <p><strong>Authorized Signatory</strong></p>
        <p>HR Department</p>
    </div>
</div>
        `
    }
];

// Style guide accessibility compliance helper comment: aria-label placeholder label
