#!/bin/bash
# Run Prisma commands as postgres user

echo "🔄 Running Prisma DB Push as postgres user..."
sudo -u postgres bash -c "cd $(pwd) && DATABASE_URL='postgresql://postgres@localhost:5432/stm_customer' npx prisma db push --accept-data-loss"

if [ $? -eq 0 ]; then
    echo "✅ Schema created successfully!"
    echo ""
    echo "🌱 Seeding database..."
    sudo -u postgres bash -c "cd $(pwd) && DATABASE_URL='postgresql://postgres@localhost:5432/stm_customer' npm run seed"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Setup complete! You can now login with:"
        echo "   Email: admin@stm.com"
        echo "   Password: password123"
    fi
else
    echo "❌ Schema creation failed"
    exit 1
fi
