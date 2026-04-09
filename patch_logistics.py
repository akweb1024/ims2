import re

with open('src/app/dashboard/logistics/page.tsx', 'r') as f:
    code = f.read()

# 1. State changes
state_changes = """    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [courierFilter, setCourierFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalOrders, setTotalOrders] = useState(0);
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);"""
code = re.sub(r'    const \[query, setQuery\] = useState\(\'\'\);\n    const \[statusFilter, setStatusFilter\] = useState\(\'\'\);\n    const \[courierFilter, setCourierFilter\] = useState\(\'\'\);', state_changes, code)

# 2. detailForm
detail_form_old = """    const [detailForm, setDetailForm] = useState({
        recipientName: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        phone: '',"""
detail_form_new = """    const [detailForm, setDetailForm] = useState({
        recipientName: '',
        shippingAddress: '',
        shippingCity: '',
        shippingState: '',
        shippingPincode: '',
        shippingCountry: 'India',
        billingAddress: '',
        billingCity: '',
        billingState: '',
        billingPincode: '',
        billingCountry: 'India',
        phone: '',"""
code = code.replace(detail_form_old, detail_form_new)

# 3. fetchData params
fetch_data_old = """            params.set('limit', '100');
            if (query.trim()) params.set('q', query.trim());"""
fetch_data_new = """            params.set('limit', '50');
            params.set('page', page.toString());
            if (query.trim()) params.set('q', query.trim());"""
code = code.replace(fetch_data_old, fetch_data_new)

# 4. setOrders & setTotalOrders
set_orders_old = """                setOrders(data.orders || []);
                setAnalytics({"""
set_orders_new = """                setOrders(data.orders || []);
                setTotalOrders(data.total || 0);
                setAnalytics({"""
code = code.replace(set_orders_old, set_orders_new)

# 5. Add fetchCustomers
fetch_customers = """    const fetchCustomers = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/customers?limit=1000', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCustomers(data.customers || []);
            }
        } catch (error) { console.error(error); }
    }, []);

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchData();
        fetchCouriers();
        fetchCustomers();
    }, [fetchData, fetchCouriers, fetchCustomers, page]);"""

code = re.sub(r'    useEffect\(\(\) => \{\n.*?    \}, \[fetchData, fetchCouriers\]\);', fetch_customers, code, flags=re.DOTALL)

# 6. items array fix
items_old = """        data.items = { description: 'Dispatch generated from logistics dashboard', qty: 1 };"""
items_new = """        data.items = [{ description: 'Dispatch generated from logistics dashboard', qty: 1 }];"""
code = code.replace(items_old, items_new)

# 7. Add bulk action processing
bulk_action = """    const handleBulkStatusUpdate = async (newStatus: string) => {
        if (!selectedOrders.length) return;
        if (!confirm(`Update ${selectedOrders.length} orders to ${newStatus}?`)) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/logistics/orders/bulk', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ orderIds: selectedOrders, status: newStatus })
            });
            if (res.ok) {
                setSelectedOrders([]);
                fetchData();
            }
        } catch (error) { console.error(error); }
    };"""
code = code.replace('    const handleStatusUpdate', bulk_action + '\n\n    const handleStatusUpdate')

# 8. syncDetailForm Address fields
sync_detail_old = """        setDetailForm({
            recipientName: order?.recipientName || '',
            address: order?.address || '',
            city: order?.city || '',
            state: order?.state || '',
            pincode: order?.pincode || '',
            country: order?.country || 'India',
            phone: order?.phone || '',"""
sync_detail_new = """        setDetailForm({
            recipientName: order?.recipientName || '',
            shippingAddress: order?.shippingAddress || '',
            shippingCity: order?.shippingCity || '',
            shippingState: order?.shippingState || '',
            shippingPincode: order?.shippingPincode || '',
            shippingCountry: order?.shippingCountry || 'India',
            billingAddress: order?.billingAddress || '',
            billingCity: order?.billingCity || '',
            billingState: order?.billingState || '',
            billingPincode: order?.billingPincode || '',
            billingCountry: order?.billingCountry || 'India',
            phone: order?.phone || '',"""
code = code.replace(sync_detail_old, sync_detail_new)

with open('src/app/dashboard/logistics/page.tsx', 'w') as f:
    f.write(code)

