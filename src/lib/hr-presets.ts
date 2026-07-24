export const HR_PRESETS = [
    {
        title: 'Offer Letter',
        type: 'OFFER_LETTER',
        content: `
<p><strong>{{companyName}}</strong><br>{{companyAddress}}<br>CIN No.: {{companyCin}}</p>
<p>Date: {{date}}</p>
<h2>Offer of Employment</h2>
<p>To,<br><strong>{{name}}</strong><br>{{address}}</p>
<p>Dear {{name}},</p>
<p>We are pleased to offer you the position of <strong>{{designation}}</strong> at <strong>{{companyName}}</strong>.</p>
<h3>Terms of Offer</h3>
<p>This offer is subject to the following conditions:</p>
<p>1. Successful background and reference verification.</p>
<p>2. This offer letter is valid till <strong>{{offerValidTill}}</strong>.</p>
<p>3. Acceptance of and compliance with the Company's HR Policies and Code of Conduct.</p>
<p>4. Completion of a probation period of three months.</p>
<p>5. CTC of <strong>{{ctcAnnual}} per annum</strong>, subject to statutory deductions and inclusive of all emoluments.</p>
<p>Your date of joining shall be <strong>{{joiningDate}}</strong>, subject to fulfilment of the above conditions.</p>
<h3>Appointment &amp; Governing Terms</h3>
<p>This Offer Letter is preliminary in nature. Detailed terms and conditions of employment — including compensation, roles and responsibilities, confidentiality, intellectual property, termination, and notice period — shall be governed exclusively by the formal Appointment Letter issued by the Company.</p>
<h3>Documentation &amp; Onboarding</h3>
<p>You will be required to submit the following documents at the time of joining:</p>
<p>1. Proof of identity and address<br>2. Educational qualification certificates<br>3. Previous employment documents (if applicable)<br>4. Any other documents as required by HR</p>
<h3>Confidentiality</h3>
<p>The contents of this Offer Letter are confidential and should not be disclosed to any third party without the prior written consent of the Company.</p>
<h3>Acceptance of Offer</h3>
<p>If you accept this offer, please sign and return a copy of this letter as a token of your acceptance. We look forward to having you join <strong>{{companyName}}</strong>.</p>
<p>For <strong>{{companyName}}</strong></p>
<p>Authorized Signatory<br>Manager (HR)</p>
<br>
<p><strong>Candidate Acceptance</strong></p>
<p>Name: {{name}}<br>Signature: ______________________<br>Date: ______________________</p>
        `
    },
    {
        title: 'Appointment Letter',
        type: 'APPOINTMENT_LETTER',
        content: `
<p><strong>Private &amp; Confidential</strong></p>
<p><strong>{{name}}</strong><br>{{parentage}}<br>{{address}}<br>Mob: {{phone}} &nbsp; Email: {{email}}</p>
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
<p>15. For the purposes of this clause, "Intellectual Property Rights" includes, but shall not be limited to, inventions and discoveries (whether patentable or not), patents, petty patents and databases, software applications, design rights (registered and unregistered), trademarks, service marks, specifications, drawings, plans, maps, trade secrets and confidential information, copyright material including computer software and databases, and technical know-how. All Intellectual Property Rights arising out of the activity / work / research, or in any development of the product / concept as part of the work / research, shall be of single ownership belonging to <strong>{{companyName}}</strong>. You should also take care of IPR issues related to third parties in your work and ensure that no breach of IPR takes place in the research / work you submit to the organization. You warrant that IPR generated by your work is legally and beneficially owned by <strong>{{companyName}}</strong> and does not infringe any third-party rights whatsoever.</p>
<p>16. Dereliction of duty, non-adherence to assigned roles, non-performance, disobedience or malpractice will be considered a serious deviation from duties and may result in termination with or without intimation.</p>
<p>17. In case you are found misusing the organization's property (including mobile, internet, computer, printer etc.), the resulting costs may be recovered from your dues and the company may terminate you from service.</p>
<p>18. You have been engaged on the presumption that the particulars furnished by you are correct. If found incorrect, or if you have concealed or withheld relevant facts, your appointment shall stand terminated/cancelled without notice.</p>
<p>19. You will be retired from service on attaining the superannuation age of 58 years, or earlier if found physically/mentally unfit as certified by a medical practitioner nominated by the company.</p>
<p>20. You would be initially posted at <strong>{{postingLocation}}</strong> and are requested to report to your Reporting Manager on joining. Upon joining, you will be required to sign a standard undertaking on your obligations to conform to organizational discipline, policies and norms. You are required to report on or before <strong>{{reportDateTime}}</strong> at our office.</p>
<h3>Undertaking</h3>
<p>I hereby undertake to give one month's notice period or surrender one month's salary, or pay one month's salary back to the company, in case I wish to leave the organization; and if I do not surrender or pay the company one month's salary, then they can recover the same through the court. After leaving the organization, I undertake not to take employment in any competitive organization where my training, knowledge, key information and trade secrets can be used against <strong>{{companyName}}</strong>.</p>
<p>I undertake that I will not be a part of any activity, event or organization, in personal capacity or in a group, which acts as a competitor to the products and services of <strong>{{companyName}}</strong> while working with the company on a full-time or part-time basis, and even after leaving the company for the next 3 years after my employment. It is clearly explained and understood that it is mandatory to obtain a No Dues Certificate before leaving the organization in order to avoid any legal liabilities.</p>
<p>If the terms and conditions of the services are fully acceptable to you, please sign and return the duplicate copy on each page, signifying your acceptance by affixing your signature. Please note that no commitments other than what is mentioned in this letter will be applicable to you or entertained by us.</p>
<h3>Annexure I — Declaration</h3>
<p>I, <strong>{{name}}</strong>, hereby declare that I have understood the Letter of Appointment and I agree to abide by the below-mentioned clauses of <strong>{{companyName}}</strong>:</p>
<p>1. All the required documents to be submitted on the date of joining.<br>2. Salary will be subject to revision in case of non-submission of the required experience certificates.<br>3. Non-disclosure of prior experience and non-submission of any of the required documents will lead to the termination of services.</p>
<p>In case the aforesaid particulars are found to be incorrect, or it is found that I have withheld some relevant facts, <strong>{{companyName}}</strong> has the right to withdraw the Letter of Offer. Please go through the contents of this letter and the annexure before signing the duplicate copy and, if satisfied, sign and return it as a token of your acceptance.</p>
<h3>Annexure I — Documents to be submitted at the time of joining</h3>
<p>1. Passport size colored photographs (02 copies)<br>2. Birth Certificate / School Leaving Certificate showing date of birth<br>3. Educational certificates (10th grade onwards) along with marksheets<br>4. Appointment and Relieving Letters of previous employers<br>5. Last month's Salary Slip<br>6. Any one photo ID and address proof (Passport / Driving License / Voter ID / PAN Card / Aadhaar)<br>7. Medical Fitness Certificate from a registered medical practitioner</p>
<h3>Annexure II — Salary Structure</h3>
{{salaryStructureTable}}
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
<p>Ref. No.: {{refNo}} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Date: {{date}}</p>
<h2>To Whomsoever It May Concern</h2>
<p>This is to certify that <strong>{{name}}</strong> has worked with our organization as <strong>{{designation}}</strong> in <strong>{{companyName}}</strong> from <strong>{{joiningDate}}</strong> to <strong>{{relievingDate}}</strong>. The last drawn monthly CTC / compensation was <strong>{{lastDrawnSalary}}</strong> per month.</p>
<p>We wish him/her all the best and success in future career endeavours.</p>
<p>For <strong>{{companyName}}</strong></p>
<br>
<p>Authorized Signatory<br>Managing Director</p>
<h2>Relieving Letter</h2>
<p>To,<br><strong>{{name}}</strong></p>
<p><strong>Subject: Relieving Letter</strong></p>
<p>In reference to your letter of resignation dated <strong>{{resignationDate}}</strong>, we have accepted your request and you are being relieved from the services of the Company on <strong>{{relievingDate}}</strong> as <strong>{{designation}}</strong>.</p>
<p>In this capacity, you had access to confidential data and you shall not, under any condition, share this data with your future employers or competitors, or for any commercial or personal gains. Any breach of this clause will be considered a breach of trust and illegal.</p>
<p>This conditional relieving letter has been issued on the basis of the documents handed over by you to your colleague / Team Leader, assuming that all information is as per the standards and policies of the organization. If any information, data or content has not been shared or transferred to the concerned person, the same shall be completed if the need arises.</p>
<p>There are no dues on either side. We wish you all the best for your future endeavours.</p>
<p>For <strong>{{companyName}}</strong></p>
<br>
<p>Authorized Signatory<br>Managing Director</p>
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
    },
    {
        title: 'Contract Agreement',
        type: 'CONTRACT',
        content: `
<p>Date: {{date}}</p>
<p>To,<br><strong>{{name}}</strong><br>{{address}}<br>Email: {{email}} &nbsp; PAN: {{pan}} &nbsp; Mobile: {{phone}}</p>
<h2>Subject: Appointment as Individual Contractor</h2>
<p>This Contract Agreement (the "Agreement") is made and entered into as of {{date}} by and between <strong>{{companyName}}</strong>, with its principal place of business located at {{companyAddress}}, and <strong>{{name}}</strong>, with the principal place at the address above (the "Contractor").</p>
<p>WHEREAS, the Company is in the business of marketing and publishing of journals and books; and the Contractor has expertise in commissioning, editing, publication and coordination of journals and books; and the Company desires to engage the Contractor to provide certain services, which the Contractor is willing to provide.</p>
<p>NOW, THEREFORE, the Parties hereby agree as follows:</p>
<h3>1. Engagement and Services</h3>
<p>(a) The Company hereby engages the Contractor to provide and perform the services of <strong>{{serviceScope}}</strong> (the "Services"), and the Contractor accepts the engagement.</p>
<p>(b) All Services shall be performed with promptness and diligence in a workmanlike manner at a level of proficiency expected of a contractor with the Contractor's represented background and experience. The Company shall provide reasonable access to information, property and personnel required to perform the Services.</p>
<p>(c) This Agreement is on a principal-to-principal basis. The Contractor shall perform all Services as an independent contractor, and nothing herein shall create any partnership, joint venture, or relationship of principal and agent or master and servant, or authorize the Contractor to create any obligation on behalf of the Company.</p>
<h3>2. Contract Period</h3>
<p>(a) This Agreement shall commence on the Effective Date and remain in effect until completion of the Services or earlier termination as provided herein.</p>
<p>(b) The Company may terminate this Agreement without cause and without liability on thirty (30) calendar days' written notice. Either Party may terminate on thirty (30) days' written notice in the event of a material breach by the other Party.</p>
<p>(c) Upon termination, all rights and duties shall cease except those that accrued prior to termination and those expressly stated to survive.</p>
<h3>3. Compensation and Expenses</h3>
<p>(a) In consideration of the Services, the Company shall pay the Contractor on an output-based payment structure only; no fixed monthly compensation shall be payable. The payment structure shall be as follows: {{paymentStructure}}. Payment shall be made only for work that is successfully completed, submitted and formally approved by the Company. Work that is incomplete, rejected, or requires major corrections shall not be eligible for payment until final approval.</p>
<p>(b) The Contractor shall be entitled to reimbursement for expenses reasonably incurred, upon submission and approval of written statements and receipts as per the Company's procedures.</p>
<p>(c) The Contractor shall submit a monthly invoice detailing the Services performed. All undisputed invoices shall be paid within thirty (30) days of receipt.</p>
<h3>4. Work Product and Intellectual Property</h3>
<p>(a) All work product generated by the Contractor in performing the Services — including information, notes, materials, processes, software, know-how, designs, inventions, improvements, copyrights, trademarks and trade secrets — is assigned to and shall be the sole and exclusive property of the Company.</p>
<p>(b) The Contractor shall execute all documents reasonably required to perfect the Company's ownership and shall not use any work product without the Company's prior written consent, and warrants that it shall not knowingly incorporate any material infringing third-party rights.</p>
<h3>5. Confidentiality</h3>
<p>The Contractor shall not, except as required by law, use the Company's confidential information for any purpose other than performing the Services, nor disclose it to any third party. Upon termination, the Contractor shall return all Company property and confidential information in tangible form.</p>
<h3>6. Indemnification</h3>
<p>The Contractor shall indemnify, defend and hold harmless the Company and its officers, directors, affiliates, agents and employees against all liabilities, losses, claims, costs and expenses (including reasonable attorney's fees) resulting from the Contractor's failure to perform, breach of any representation or warranty, infringement of third-party rights, or any negligence, fraud, dishonesty, misconduct or violation of this Agreement.</p>
<h3>7. Non-Competition and Non-Solicitation</h3>
<p>During the term, the Contractor shall not engage in any business or activities competitive with the Company without prior written consent. For eleven (11) months after termination, the Contractor shall not divert any business of the Company or solicit or employ any person employed by the Company.</p>
<h3>8. Independent Contractor</h3>
<p>All Services are rendered as an independent contractor. This Agreement does not create an employer-employee relationship, and the Contractor is not entitled to employee benefits. The Contractor agrees to pay all taxes due on the compensation.</p>
<h3>9. Governing Law and Dispute Resolution</h3>
<p>This Agreement shall be governed by the laws of India. The Parties consent to the jurisdiction of the Delhi High Court, and all disputes shall be resolved exclusively in the courts of Delhi.</p>
<h3>10. Tax Deduction at Source (TDS)</h3>
<p>This engagement shall be treated as a contractual arrangement under Section 194C of the Income Tax Act, 1961. The Company shall deduct TDS at 1% from the gross service amount payable, subject to statutory threshold limits, deposit the deducted TDS within prescribed timelines and issue Form 16A. If a valid PAN is not provided, TDS shall be deducted at the higher rate prescribed by law. The Contractor shall be responsible for all applicable taxes, including income tax and GST (if applicable).</p>
<p>IN WITNESS WHEREOF, the Parties have duly executed this Agreement as of the date first written above.</p>
<table>
<tr><th>Signed for and on behalf of {{companyName}}</th><th>Signed by {{name}}</th></tr>
<tr><td>Authorized Signatory<br>Title: Managing Director</td><td>{{name}}<br>Title: Contractor</td></tr>
</table>
        `
    },
    {
        title: 'Freelancer Agreement',
        type: 'FREELANCER_AGREEMENT',
        content: `
<p>Date: {{date}}</p>
<p>To,<br><strong>{{name}}</strong><br>{{address}}</p>
<h2>Individual Freelancer Agreement</h2>
<p>This Freelancer Agreement (the "Agreement") is made and entered into on {{date}} by and between <strong>{{companyName}}</strong>, having its principal place of business at {{companyAddress}}, and <strong>{{name}}</strong> (the "Freelancer").</p>
<p>WHEREAS, the Company is engaged in the business of publishing journals and books; and the Freelancer has expertise in commissioning, editing and publication of journals and books; and the Company desires to engage the Freelancer, who is willing to provide such services.</p>
<p>NOW, THEREFORE, the Parties hereby agree as follows:</p>
<h3>1. Engagement and Services</h3>
<p>1.1 The Company hereby engages the Freelancer to provide and perform services as a Freelancer (the "Services"), and the Freelancer accepts the engagement.</p>
<p>1.2 The Freelancer shall perform all Services promptly, diligently and professionally, at a level of proficiency expected of an expert with the Freelancer's background. The Company shall provide reasonable access to the necessary information, property and personnel.</p>
<p>1.3 This Agreement is executed on a principal-to-principal basis; the Freelancer performs all Services as an independent contractor. Nothing herein creates an employer-employee relationship, partnership, joint venture, or principal-agent relationship.</p>
<h3>2. Freelancer Period</h3>
<p>2.1 This Agreement commences on the Effective Date and remains in effect until completion of the Services or earlier termination.</p>
<p>2.2 The Company may terminate at any time, without cause or liability, on thirty (30) days' written notice. Either Party may terminate on thirty (30) days' written notice for a material breach.</p>
<p>2.3 Upon termination, all rights and duties shall cease except those accrued before termination and those expressly stated to survive.</p>
<h3>3. Obligations</h3>
<p>3.1 The Freelancer shall use commercially reasonable efforts to deliver the Services within the timelines set from time to time, with all the skill and care expected of a qualified, competent and experienced freelancer.</p>
<p>3.2 The Freelancer shall comply with all applicable laws, maintain proper records, and perform the Services in accordance with the Company's instructions and this Agreement.</p>
<p>3.3 Active Engagement and Availability. The Freelancer is expected to remain dedicated to Company activities — attending meetings, participating in calls and responding to emails — as availability is key to timely completion of tasks.</p>
<p>3.4 Liability for Errors. In the event of any errors or unethical behaviour during task execution, the Freelancer shall be liable. If payment has been made for a task and unethical practices are detected, the Company reserves the right to recover a bearable amount from the Freelancer at settlement.</p>
<h3>4. Freelancer Fee</h3>
<p>4.1 In consideration of the Services, the Company shall pay the Freelancer a fee of <strong>{{freelanceFee}} per article</strong> for the end-to-end process up to online publication in the journals assigned. The term "article" refers to a complete manuscript submitted by an author for publication. All articles will be verified by the Manager of Publications, and payment shall be made by the 10th of the following month.</p>
<p>4.2 For papers received through conferences or other sources processed end-to-end by the Freelancer, a fee of <strong>{{conferenceFee}} per article</strong> shall be provided. Where the Freelancer is responsible solely for the collection of articles and processing is undertaken by other Journal Managers, the Freelancer shall be entitled to <strong>{{collectionFee}} per article</strong>.</p>
<p>4.3 The Freelancer shall submit a monthly invoice; undisputed invoices shall be paid within thirty (30) days of receipt.</p>
<h3>5. Work Product and Intellectual Property</h3>
<p>All work product generated by the Freelancer in performing the Services is assigned to and shall be the sole and exclusive property of the Company. The Freelancer shall execute all documents required to perfect the Company's ownership and shall not use any work product without the Company's prior written consent.</p>
<h3>6. Confidentiality</h3>
<p>The Freelancer shall not, except as required by law, use the Company's confidential information for any purpose other than performing the Services, nor disclose it to any third party. Upon termination, the Freelancer shall return all Company property and confidential information.</p>
<h3>7. Indemnification</h3>
<p>The Freelancer shall indemnify, defend and hold harmless the Company and its officers, directors, affiliates, agents and employees against all liabilities, losses, claims, costs and expenses (including reasonable attorney's fees) arising from the Freelancer's failure to perform, breach of any representation or warranty, infringement of third-party rights, or any negligence, fraud, misconduct or violation of this Agreement.</p>
<h3>8. Non-Competition and Non-Solicitation</h3>
<p>During the term, the Freelancer shall not engage in any business competitive with the Company without prior written consent. For eleven (11) months following termination, the Freelancer shall not divert any business from the Company or solicit any person employed by the Company.</p>
<h3>9. Independent Contractor</h3>
<p>All Services are performed as an independent contractor. This Agreement does not create an employer-employee relationship, and the Freelancer is not entitled to employee benefits. The Freelancer agrees to pay all taxes related to the Freelancer Fee.</p>
<h3>10. Governing Law and Dispute Resolution</h3>
<p>This Agreement shall be governed by the laws of India. The Parties consent to the jurisdiction of the Delhi High Court, and all disputes shall be resolved exclusively in the courts of Delhi.</p>
<p>IN WITNESS WHEREOF, the Parties have duly executed this Agreement as of the date first written above.</p>
<table>
<tr><th>Signed for and on behalf of {{companyName}}</th><th>Signed by {{name}}</th></tr>
<tr><td>Authorized Signatory<br>Title: Managing Director</td><td>{{name}}<br>Title: Freelancer</td></tr>
</table>
        `
    }
];

// Style guide accessibility compliance helper comment: aria-label placeholder label
