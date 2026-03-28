import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Assumes typical prisma import path for this project

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
    const payload = await req.json();

    // 1. Extract values based on field mapping
    const getValue = (fieldKey: keyof typeof FIELD_MAP) => {
      const id = FIELD_MAP[fieldKey];
      return payload[id] !== undefined ? String(payload[id]) : null;
    };

    const pid = getValue('pid');
    
    // We strictly require at least an ID, Name, and Email to process the hook
    if (!pid) {
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

    // 2. Insert or update the participant mapped by `pid`
    const participant = await prisma.lMSParticipant.upsert({
      where: { pid: pid },
      update: {
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
      },
      create: {
        pid: pid,
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
      }
    });

    return NextResponse.json({ success: true, id: participant.id });
  } catch (error) {
    console.error('Nanoschool Webhook Error:', error);
    return NextResponse.json(
      { error: 'Internal server error processing webhook' },
      { status: 500 }
    );
  }
}
