import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import * as PDFLib from "https://esm.sh/pdf-lib@1.17.1"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Validate request
    const { quote_id } = await req.json()
    if (!quote_id) {
      throw new Error('Missing required quote_id parameter')
    }

    // Get quote data
    const { data: quote, error } = await supabase
      .from('quotes')
      .select('id, system_size, total_cost, customer_email, calculations')
      .eq('id', quote_id)
      .single()

    if (error || !quote) {
      throw new Error(error?.message || 'Quote not found')
    }

    // Create basic PDF
    const pdfDoc = await PDFLib.PDFDocument.create()
    const page = pdfDoc.addPage([612, 792]) // Letter size
    
    // Set up fonts
    const font = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold)
    const fontSize = 12
    const margin = 50
    let yPosition = page.getHeight() - margin

    // Add basic content
    page.drawText('Solar Quote Summary', {
      x: margin,
      y: yPosition,
      size: fontSize + 4,
      font,
    })
    yPosition -= fontSize * 2

    // Quote Info
    page.drawText(`Quote ID: ${quote_id}`, { x: margin, y: yPosition, size: fontSize, font })
    yPosition -= fontSize * 1.5
    page.drawText(`System Size: ${quote.system_size} kW`, { x: margin, y: yPosition, size: fontSize, font })
    yPosition -= fontSize * 1.5
    page.drawText(`Total Cost: $${quote.total_cost.toLocaleString()}`, { x: margin, y: yPosition, size: fontSize, font })
    yPosition -= fontSize * 2

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save()

    // Store in storage
    const { data: file, error: storageError } = await supabase.storage
      .from('quotes-pdf')
      .upload(`quote-${quote_id}.pdf`, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (storageError) throw storageError

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('quotes-pdf')
      .getPublicUrl(file.path)

    return new Response(
      JSON.stringify({ 
        success: true,
        pdf_url: urlData.publicUrl,
        quote_id: quote_id
      }), 
      {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        }
      }
    )

  } catch (error) {
    console.error("Error:", error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }), 
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        }
      }
    )
  }
})
