import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Assumes typical prisma import path for this project
import { LMSInvoiceService } from '@/lib/services/lms-invoice';
import { logger } from '@/lib/logger';
import { handleApiError, AuthorizationError } from '@/lib/error-handler';

function getWebhookSecret(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return req.headers.get("x-webhook-secret");
}

// Verify mapped payload IDs based on Nanoschool format
const FIELD_MAP = {
  pid: '9788',
  workshopTitle: '9789',
  name: '9792',
  email: '9793',
  mobileNumber: '9794',
  currentAffiliation: '9795',
  profession: '9796',
  designation: '9797',
  address: '9800',
  state: '9801',
  country: '9802',
  pinCode: '9805',
  gstVatNo: '9806',
  courseFee: '9809',
  hasCoupon: '9811',
  couponCode: '9815',
  payableAmount: '9810',
  otherCurrency: '9812',
  referralSource: '9814',
  paymentStatus: '9817',
  razorpayOrderId: '9816',
  learningMode: '9824',
  category: '9823',
  razorpayPaymentId: '9819',
  razorpaySignature: '9821',
};

export async function POST(req: Request) {
  try {
    // 0. Secret Authentication (Aligned with CRM leads pattern)
    const expectedSecret = process.env.NANOSCHOOL_WEBHOOK_SECRET || process.env.LEAD_WEBHOOK_SECRET;
    const receivedSecret = getWebhookSecret(req);

    if (!expectedSecret) {
      throw new Error("LMS webhook is not configured with a secret");
    }

    if (receivedSecret !== expectedSecret) {
      logger.security("Invalid LMS/Nanoschool webhook secret", {
        path: "/api/webhooks/nanoschool-registration",
      });
      return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';
    let payload: any = {};

    if (contentType.includes('application/json')) {
      payload = await req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        payload[key] = value;
      });
    } else {
      // Fallback for some systems that don't send proper content-type but send text/plain as json
      const text = await req.text();
      try {
        payload = JSON.parse(text);
      } catch {
        // Not JSON, maybe it was meant as form data? 
        // But usually req.text() is just raw.
        return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 400 });
      }
    }

    // 1. Extract values based on field mapping
    const getValue = (fieldKey: keyof typeof FIELD_MAP) => {
      const id = FIELD_MAP[fieldKey];
      const val = payload[id];
      // If the value is undefined, null, or an empty string, we return null
      // This is CRITICAL for unique fields like razorpayOrderId where multiple "" strings would break DB constraints
      if (val === undefined || val === null || String(val).trim() === '') {
        return null;
      }
      return String(val);
    };

    const pid = getValue('pid');
    
    // We strictly require at least an ID, Name, and Email to process the hook
    if (!pid) {
      console.error('Nanoschool Webhook Missing pid. Payload keys:', Object.keys(payload));
      return NextResponse.json({ error: 'Missing participant ID (pid)' }, { status: 400 });
    }

    const name = getValue('name') || 'Unknown';
    const email = getValue('email') || '';

    // Convert numeric strings
    const courseFeeStr = getValue('courseFee');
    const courseFee = courseFeeStr ? parseFloat(courseFeeStr) : 0;
    
    const payableAmountStr = getValue('payableAmount');
    const payableAmount = payableAmountStr ? parseFloat(payableAmountStr) : 0;
    
    const hasCouponStr = getValue('hasCoupon');
    const hasCoupon = hasCouponStr?.toLowerCase() === 'yes' || hasCouponStr === 'true' || hasCouponStr === '1';

    // Optional dynamic scoping from root payload (like CRM Leads)
    const targetCompanyId = payload.companyId || null;
    const targetBrandId = payload.brandId || null;

    // 2. Insert or update the participant mapped by `pid`
    // We use data object to avoid repetition in update/create
    const data = {
      workshopTitle: getValue('workshopTitle'),
      name: name,
      email: email,
      mobileNumber: getValue('mobileNumber'),
      currentAffiliation: getValue('currentAffiliation'),
      profession: getValue('profession'),
      designation: getValue('designation'),
      address: getValue('address'),
      state: getValue('state'),
      country: getValue('country'),
      pinCode: getValue('pinCode'),
      gstVatNo: getValue('gstVatNo'),
      courseFee: courseFee,
      hasCoupon: hasCoupon,
      couponCode: getValue('couponCode'),
      payableAmount: payableAmount,
      otherCurrency: getValue('otherCurrency'),
      referralSource: getValue('referralSource'),
      paymentStatus: getValue('paymentStatus'),
      razorpayOrderId: getValue('razorpayOrderId'),
      razorpayPaymentId: getValue('razorpayPaymentId'),
      razorpaySignature: getValue('razorpaySignature'),
      learningMode: getValue('learningMode'),
      category: getValue('category'),
    };

    const participant = await prisma.lMSParticipant.upsert({
      where: { pid: pid },
      update: data,
      create: {
        pid: pid,
        ...data
      }
    });

    // 3. Automatic Invoicing for SUCCESS payments
    if (participant.paymentStatus?.toLowerCase() === 'success' || participant.paymentStatus?.toLowerCase() === 'completed') {
       try {
          await LMSInvoiceService.generateForParticipant(
            participant.id, 
            targetCompanyId, 
            targetBrandId
          );
          logger.info('Auto-invoice generated via webhook', { 
            participantId: participant.id,
            companyId: targetCompanyId,
            brandId: targetBrandId
          });
       } catch (invError) {
          logger.error('Failed to auto-generate invoice in webhook', invError, { participantId: participant.id });
       }
    }

    return NextResponse.json({ success: true, id: participant.id });
  } catch (error) {
    console.error('Nanoschool Webhook Error:', error);
    return NextResponse.json(
      { error: 'Internal server error processing webhook' },
      { status: 500 }
    );
  }
}
