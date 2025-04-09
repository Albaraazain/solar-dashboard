# Solar Dashboard

A Next.js application for managing solar panel installations, quotes, and customer data using Supabase as the backend.

## 🚀 Tech Stack

- **Frontend**: Next.js 15.2.4 with TypeScript
- **Styling**: Tailwind CSS with Shadcn UI components
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **State Management**: React Hook Form with Zod validation
- **Database**: PostgreSQL (via Supabase with anonymous access)

## 📋 Prerequisites

- Node.js 18+ and npm/pnpm
- Supabase CLI
- Git

## 🛠️ Setup Instructions

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd solar-dashboard
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up Supabase locally**
   ```bash
   # Install Supabase CLI if you haven't already
   npm install -g supabase

   # Start Supabase locally
   supabase start

   # Initialize the database with seed data
   supabase db reset
   ```

4. **Environment Variables**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

5. **Start the development server**
   ```bash
   pnpm dev
   ```

## 🏗️ Project Structure

```
solar-dashboard/
├── app/                    # Next.js app router
│   ├── bill/             # Bills management
│   ├── quote/            # System sizing calculations
    ├── home/  
│   └── layout.tsx         # Root layout
├── components/            # Reusable components
│   ├── ui/               # Shadcn UI components
│   └── theme-provider.tsx # Theme configuration
├── lib/                   # Utility functions
├── supabase/             # Supabase configuration
│   ├── migrations/       # Database migrations
│   └── seed.sql         # Seed data
└── styles/               # Global styles
```

## 🗄️ Database Schema & Security

### Core Tables
- `panels`: Solar panel inventory
- `inverters`: Inverter inventory
- `structure_types`: Installation structure types
- `variable_costs`: Variable cost components
- `bracket_costs`: Bracket cost configurations
- `bills`: Customer bills (temporary storage)
- `quotes`: System quotes (temporary storage)
- `documents`: Document management (temporary storage)

### Database Security

All tables are configured with Row Level Security (RLS) policies:

```sql
-- Enable RLS on all tables
ALTER TABLE public.panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inverters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.structure_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variable_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bracket_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Anonymous read access for reference data
CREATE POLICY "Allow anonymous read access" ON public.panels FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read access" ON public.inverters FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read access" ON public.structure_types FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read access" ON public.variable_costs FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read access" ON public.bracket_costs FOR SELECT USING (true);

-- Temporary storage policies (24-hour retention)
CREATE POLICY "Allow anonymous insert" ON public.bills FOR INSERT WITH CHECK (true);
CREATE POLICY "Temporary access" ON public.bills FOR SELECT 
  USING (created_at > NOW() - INTERVAL '24 hours');

CREATE POLICY "Allow anonymous insert" ON public.quotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Temporary access" ON public.quotes FOR SELECT 
  USING (created_at > NOW() - INTERVAL '24 hours');

CREATE POLICY "Allow anonymous insert" ON public.documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Temporary access" ON public.documents FOR SELECT 
  USING (created_at > NOW() - INTERVAL '24 hours');
```

### Data Flow
1. Reference data (panels, inverters, etc.) is read-only and publicly accessible
2. User-generated data (bills, quotes, documents) is:
   - Temporarily stored (24-hour retention)
   - Anonymous users can create new entries
   - Users can only access their own data within the 24-hour window
   - Automatically cleaned up by a scheduled job

## 🔧 Development Workflow

### Database Migrations

1. **Create a new migration**
   ```bash
   supabase migration new your_migration_name
   ```

2. **Apply migrations**
   ```bash
   supabase db reset
   ```

### Supabase Edge Functions

Edge Functions in Supabase are implemented using **Deno** and **TypeScript**. Deno is a secure runtime for JavaScript and TypeScript that provides a modern development experience.

Key features of Supabase Edge Functions:
- Written in TypeScript/JavaScript
- Runs on Deno runtime
- Built-in TypeScript support
- No npm/package.json needed
- Direct URL imports supported
- Secure by default
- Fast cold starts
- Global edge deployment

1. **Create a new function**
   ```bash
   supabase functions new calculate-quote
   ```
   This creates a new TypeScript file in `supabase/functions/calculate-quote/index.ts`

2. **Local development**
   ```bash
   # Serve function locally for development
   supabase functions serve calculate-quote --no-verify-jwt

   # Test the function
   curl -L -X POST 'http://localhost:54321/functions/v1/calculate-quote' \
     -H 'Content-Type: application/json' \
     -d '{"billData": {"unitsConsumed": 500}}'
   ```

3. **Deploy functions**
   ```bash
   # Deploy a single function
   supabase functions deploy calculate-quote

   # Deploy all functions
   supabase functions deploy
   ```

### Edge Function Examples

```typescript
// supabase/functions/calculate-quote/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// TypeScript type definitions
interface BillData {
  unitsConsumed: number
  referenceNumber?: string
}

interface QuoteResult {
  systemSize: number
  costs: {
    panels: number
    inverter: number
    installation: number
    total: number
  }
}

serve(async (req) => {
  try {
    const { billData } = await req.json() as { billData: BillData }
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )
    
    // Get latest cost data
    const { data: costs } = await supabase
      .from('variable_costs')
      .select('*')
    
    // Calculate system size and costs
    const systemSize = calculateSystemSize(billData.unitsConsumed)
    const quoteCosts = await calculateCosts(systemSize, costs)
    
    const result: QuoteResult = {
      systemSize,
      costs: quoteCosts
    }
    
    return new Response(JSON.stringify(result), {
      headers: { 
        'Content-Type': 'application/json',
        // Enable CORS
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

// supabase/functions/calculate-quote/helper.ts
import { create } from 'https://deno.land/x/djwt@v2.8/mod.ts'

export function calculateSystemSize(unitsConsumed: number): number {
  // Implementation of solar system size calculation
  return unitsConsumed * 0.8 / 30 // Example calculation
}

export async function calculateCosts(systemSize: number, costs: any[]): Promise<any> {
  // Implementation of cost calculation using current rates
  // ... calculation logic
  return {
    panels: systemSize * 400, // Example calculation
    inverter: systemSize * 200,
    installation: systemSize * 100,
    total: systemSize * 700
  }
}

// app/api/calculate-quote/route.ts
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function POST(request: Request) {
  const billData = await request.json()
  const supabase = createRouteHandlerClient({ cookies })
  
  try {
    // Call Edge Function
    const { data, error } = await supabase.functions.invoke('calculate-quote', {
      body: { billData }
    })
    
    if (error) throw error
    
    // Store quote with 24-hour retention
    const { error: insertError } = await supabase
      .from('quotes')
      .insert([{
        ...data,
        bill_id: billData.id,
        created_at: new Date().toISOString()
      }])
    
    if (insertError) throw insertError
    
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
```

### Edge Function Security
- Functions run in isolated environments
- No authentication required for public endpoints
- Rate limiting applied to prevent abuse
- Input validation using Zod schemas
- Temporary data storage with 24-hour retention

## 📡 API Integration with Anonymous Access

### Supabase Client Setup with Anonymous Access

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

// Create a single supabase client for the entire application
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    db: {
      schema: 'public'
    },
    auth: {
      persistSession: false // Disable session persistence
    }
  }
)
```

### Row Level Security (RLS) Policies
All tables are configured with RLS policies to allow anonymous read access:

```sql
-- Example policy for the panels table
ALTER TABLE public.panels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read access" ON public.panels
  FOR SELECT
  USING (true);
```

### Data Fetching Example

```typescript
// app/sizing/page.tsx
const fetchPanels = async () => {
  const { data, error } = await supabase
    .from('panels')
    .select('*')
    .order('power', { ascending: true })
  
  if (error) {
    console.error('Error fetching panels:', error)
    return []
  }
  return data
}

// Example React component using the data
export default async function SizingPage() {
  const panels = await fetchPanels()
  
  return (
    <div>
      <h1>Available Solar Panels</h1>
      <div className="grid gap-4">
        {panels.map(panel => (
          <div key={panel.id} className="p-4 border rounded">
            <h3>{panel.brand}</h3>
            <p>Power: {panel.power}W</p>
            <p>Price: ${panel.price}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

## 🚀 Deployment

1. **Build the application**
   ```bash
   pnpm build
   ```

2. **Deploy to production**
   ```bash
   # Deploy Supabase changes
   supabase db push

   # Deploy Edge Functions
   supabase functions deploy

   # Deploy Next.js application
   # Use your preferred hosting platform (Vercel, etc.)
   ```

## 🧪 Testing

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Shadcn UI Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.