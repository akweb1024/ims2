import re

with open('src/app/dashboard/logistics/page.tsx', 'r') as f:
    code = f.read()

# Create Order Modal Address
create_modal_old = """                                    <div className="col-span-2">
                                        <label className="label">Destination Address</label>
                                        <textarea name="address" className="input" required rows={2} placeholder="Street details..." />
                                    </div>
                                    <div>
                                        <label className="label">City</label>
                                        <input name="city" className="input" required />
                                    </div>
                                    <div>
                                        <label className="label">Zip/Pincode</label>
                                        <input name="pincode" className="input" required />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="label">Country</label>
                                        <input name="country" className="input" required defaultValue="India" />
                                    </div>"""
create_modal_new = """                                    <div className="col-span-2 mt-4 p-4 bg-secondary-50 rounded-xl">
                                        <h4 className="font-bold text-secondary-900 mb-2">Shipping Address</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                <label className="label">Address block</label>
                                                <textarea name="shippingAddress" className="input" required rows={2} />
                                            </div>
                                            <div>
                                                <label className="label">City</label>
                                                <input name="shippingCity" className="input" required />
                                            </div>
                                            <div>
                                                <label className="label">Pincode</label>
                                                <input name="shippingPincode" className="input" required />
                                            </div>
                                            <div>
                                                <label className="label">State</label>
                                                <input name="shippingState" className="input" required />
                                            </div>
                                            <div>
                                                <label className="label">Country</label>
                                                <input name="shippingCountry" className="input" required defaultValue="India" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-2 p-4 bg-secondary-50 rounded-xl">
                                        <h4 className="font-bold text-secondary-900 mb-2">Billing Address (Optional)</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                <label className="label">Address block</label>
                                                <textarea name="billingAddress" className="input" rows={2} />
                                            </div>
                                            <div>
                                                <label className="label">City</label>
                                                <input name="billingCity" className="input" />
                                            </div>
                                            <div>
                                                <label className="label">Pincode</label>
                                                <input name="billingPincode" className="input" />
                                            </div>
                                            <div>
                                                <label className="label">State</label>
                                                <input name="billingState" className="input" />
                                            </div>
                                            <div>
                                                <label className="label">Country</label>
                                                <input name="billingCountry" className="input" defaultValue="India" />
                                            </div>
                                        </div>
                                    </div>"""
code = code.replace(create_modal_old, create_modal_new)

# Add Customer selection to create form
customer_select = """                                <div>
                                    <label className="label">Customer / Institution</label>
                                    <select name="customerProfileId" className="input">
                                        <option value="">Select Customer (Optional)</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.organizationName ? `(${c.organizationName})` : ''}</option>)}
                                    </select>
                                </div>"""

code = code.replace('                                <div>\n                                    <label className="label">Recipient Identity</label>', customer_select + '\n                                <div>\n                                    <label className="label">Recipient Identity</label>')


# Detail Form Address fields
detail_addr_old = """                                        <div className="md:col-span-2">
                                            <label className="label">Address</label>
                                            <textarea
                                                className="input"
                                                rows={2}
                                                value={detailForm.address}
                                                onChange={(e) => setDetailForm((prev) => ({ ...prev, address: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">City</label>
                                            <input
                                                className="input"
                                                value={detailForm.city}
                                                onChange={(e) => setDetailForm((prev) => ({ ...prev, city: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">State</label>
                                            <input
                                                className="input"
                                                value={detailForm.state}
                                                onChange={(e) => setDetailForm((prev) => ({ ...prev, state: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Pincode</label>
                                            <input
                                                className="input"
                                                value={detailForm.pincode}
                                                onChange={(e) => setDetailForm((prev) => ({ ...prev, pincode: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Country</label>
                                            <input
                                                className="input"
                                                value={detailForm.country}
                                                onChange={(e) => setDetailForm((prev) => ({ ...prev, country: e.target.value }))}
                                            />
                                        </div>"""

detail_addr_new = """                                        <div className="col-span-1 md:col-span-2 p-4 bg-secondary-50 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <h4 className="col-span-2 font-bold text-secondary-900">Shipping</h4>
                                            <div className="md:col-span-2">
                                                <label className="label">Address</label>
                                                <textarea className="input" rows={2} value={detailForm.shippingAddress} onChange={(e) => setDetailForm((prev) => ({ ...prev, shippingAddress: e.target.value }))} />
                                            </div>
                                            <div>
                                                <label className="label">City</label>
                                                <input className="input" value={detailForm.shippingCity} onChange={(e) => setDetailForm((prev) => ({ ...prev, shippingCity: e.target.value }))} />
                                            </div>
                                            <div>
                                                <label className="label">State</label>
                                                <input className="input" value={detailForm.shippingState} onChange={(e) => setDetailForm((prev) => ({ ...prev, shippingState: e.target.value }))} />
                                            </div>
                                            <div>
                                                <label className="label">Pincode</label>
                                                <input className="input" value={detailForm.shippingPincode} onChange={(e) => setDetailForm((prev) => ({ ...prev, shippingPincode: e.target.value }))} />
                                            </div>
                                            <div>
                                                <label className="label">Country</label>
                                                <input className="input" value={detailForm.shippingCountry} onChange={(e) => setDetailForm((prev) => ({ ...prev, shippingCountry: e.target.value }))} />
                                            </div>
                                        </div>

                                        <div className="col-span-1 md:col-span-2 p-4 bg-secondary-50 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <h4 className="col-span-2 font-bold text-secondary-900">Billing</h4>
                                            <div className="md:col-span-2">
                                                <label className="label">Address</label>
                                                <textarea className="input" rows={2} value={detailForm.billingAddress} onChange={(e) => setDetailForm((prev) => ({ ...prev, billingAddress: e.target.value }))} />
                                            </div>
                                            <div>
                                                <label className="label">City</label>
                                                <input className="input" value={detailForm.billingCity} onChange={(e) => setDetailForm((prev) => ({ ...prev, billingCity: e.target.value }))} />
                                            </div>
                                            <div>
                                                <label className="label">State</label>
                                                <input className="input" value={detailForm.billingState} onChange={(e) => setDetailForm((prev) => ({ ...prev, billingState: e.target.value }))} />
                                            </div>
                                            <div>
                                                <label className="label">Pincode</label>
                                                <input className="input" value={detailForm.billingPincode} onChange={(e) => setDetailForm((prev) => ({ ...prev, billingPincode: e.target.value }))} />
                                            </div>
                                            <div>
                                                <label className="label">Country</label>
                                                <input className="input" value={detailForm.billingCountry} onChange={(e) => setDetailForm((prev) => ({ ...prev, billingCountry: e.target.value }))} />
                                            </div>
                                        </div>"""
code = code.replace(detail_addr_old, detail_addr_new)


# Checkboxes in table head
head_old = """                                        <tr>
                                            <th className="px-6 py-4">Invoice</th>"""
head_new = """                                        <tr>
                                            <th className="px-6 py-4 w-12">
                                                <input type="checkbox" className="rounded" onChange={(e) => setSelectedOrders(e.target.checked ? orders.map(o => o.id) : [])} checked={selectedOrders.length === orders.length && orders.length > 0} />
                                            </th>
                                            <th className="px-6 py-4">Invoice</th>"""
code = code.replace(head_old, head_new)

# Checkboxes in table body
body_old = """                                                <td className="px-6 py-4">
                                                    {order.invoice ? ("""
body_new = """                                                <td className="px-6 py-4">
                                                    <input type="checkbox" className="rounded" checked={selectedOrders.includes(order.id)} onChange={(e) => setSelectedOrders(prev => e.target.checked ? [...prev, order.id] : prev.filter(id => id !== order.id))} />
                                                </td>
                                                <td className="px-6 py-4">
                                                    {order.invoice ? ("""
code = code.replace(body_old, body_new)

# Bulk Action Dropdown
bulk_action_ui = """                        <div className="flex justify-between items-center bg-secondary-50 p-2 rounded-xl mb-4">
                            <div className="flex items-center gap-4 pl-4">
                                <span className="text-xs font-bold text-secondary-500">{selectedOrders.length} selected</span>
                                {selectedOrders.length > 0 && (
                                    <select
                                        className="input py-1 text-xs"
                                        onChange={(e) => {
                                            if(e.target.value) handleBulkStatusUpdate(e.target.value);
                                            e.target.value = "";
                                        }}
                                    >
                                        <option value="">Bulk Status Update...</option>
                                        <option value="PROCESSING">Processing</option>
                                        <option value="READY_TO_SHIP">Ready to Ship</option>
                                        <option value="SHIPPED">Shipped</option>
                                        <option value="DELIVERED">Delivered</option>
                                    </select>
                                )}
                            </div>
                        </div>"""
code = code.replace('                        <div className="card-premium p-0 overflow-hidden">', bulk_action_ui + '\n                        <div className="card-premium p-0 overflow-hidden">')

# Pagination UI
pagination_ui = """                            <div className="p-4 border-t border-secondary-100 flex items-center justify-between">
                                <span className="text-xs text-secondary-500">Showing {orders.length} of {totalOrders}</span>
                                <div className="flex gap-2">
                                    <button disabled={page === 1} onClick={() => setPage(page - 1)} className="btn btn-secondary py-1 px-3 text-xs">Prev</button>
                                    <button disabled={orders.length < 50} onClick={() => setPage(page + 1)} className="btn btn-secondary py-1 px-3 text-xs">Next</button>
                                </div>
                            </div>"""
code = code.replace('                            </div>\n                        </div>\n                    </div>\n                )', '                            </div>\n' + pagination_ui + '\n                        </div>\n                    </div>\n                )')


with open('src/app/dashboard/logistics/page.tsx', 'w') as f:
    f.write(code)

