'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function setLocale(locale: 'en' | 'de') {
  cookies().set('locale', locale, { path: '/', maxAge: 60 * 60 * 24 * 365 });
  revalidatePath('/', 'layout');
}
