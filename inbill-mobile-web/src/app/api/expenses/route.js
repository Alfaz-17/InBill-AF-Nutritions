import { neon } from '@neondatabase/serverless';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const cookieStore = await cookies();
    const neonUrl = cookieStore.get('inbill_cloud')?.value;

    if (!neonUrl) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sql = neon(neonUrl);
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let expenses = [];
    if (from && to) {
      expenses = await sql`
        SELECT * FROM expenses 
        WHERE date::text >= ${from} AND date::text <= ${to + ' 23:59:59'}
        ORDER BY date DESC, id DESC
      `;
    } else {
      expenses = await sql`
        SELECT * FROM expenses 
        ORDER BY date DESC, id DESC
      `;
    }

    const categories = await sql`
      SELECT * FROM expense_categories 
      ORDER BY is_default DESC, name ASC
    `;

    return NextResponse.json({ expenses, categories });
  } catch (e) {
    console.error('Expenses GET error:', e);
    return NextResponse.json({ error: 'Failed to fetch expenses: ' + e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const cookieStore = await cookies();
    const neonUrl = cookieStore.get('inbill_cloud')?.value;

    if (!neonUrl) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sql = neon(neonUrl);
    const body = await req.json();

    // Support two types of actions: add new expense category OR add new expense
    const { action = 'add_expense', category, description = '', amount, date, category_name } = body;

    if (action === 'add_category') {
      const trimmedCategory = (category_name || '').trim();
      if (!trimmedCategory) {
        return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
      }

      // Check if it already exists
      const exists = await sql`
        SELECT id FROM expense_categories 
        WHERE LOWER(name) = LOWER(${trimmedCategory})
      `;

      if (exists.length > 0) {
        return NextResponse.json({ error: 'Category already exists' }, { status: 400 });
      }

      const insertRes = await sql`
        INSERT INTO expense_categories (name, is_default)
        VALUES (${trimmedCategory}, 0)
        RETURNING *
      `;

      return NextResponse.json({ success: true, category: insertRes[0] });
    } else {
      const parsedAmount = parseFloat(amount) || 0;
      if (!category) {
        return NextResponse.json({ error: 'Category is required' }, { status: 400 });
      }
      if (parsedAmount <= 0) {
        return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 });
      }

      const todayStr = new Date().toISOString().slice(0, 10);
      const expenseDate = date || todayStr;

      const insertRes = await sql`
        INSERT INTO expenses (category, description, amount, date)
        VALUES (${category}, ${description}, ${parsedAmount}, ${expenseDate})
        RETURNING *
      `;

      return NextResponse.json({ success: true, expense: insertRes[0] });
    }
  } catch (e) {
    console.error('Expenses POST error:', e);
    return NextResponse.json({ error: 'Failed to save expense data: ' + e.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const cookieStore = await cookies();
    const neonUrl = cookieStore.get('inbill_cloud')?.value;

    if (!neonUrl) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sql = neon(neonUrl);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type') || 'expense'; // 'expense' or 'category'

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    if (type === 'category') {
      // Validate that category is not a default one
      const catRows = await sql`SELECT is_default FROM expense_categories WHERE id = ${id}`;
      if (catRows.length > 0 && catRows[0].is_default === 1) {
        return NextResponse.json({ error: 'Cannot delete default category' }, { status: 400 });
      }

      await sql`DELETE FROM expense_categories WHERE id = ${id}`;
      return NextResponse.json({ success: true, message: 'Category deleted successfully' });
    } else {
      await sql`DELETE FROM expenses WHERE id = ${id}`;
      return NextResponse.json({ success: true, message: 'Expense deleted successfully' });
    }
  } catch (e) {
    console.error('Expenses DELETE error:', e);
    return NextResponse.json({ error: 'Failed to delete: ' + e.message }, { status: 500 });
  }
}
