import { http, HttpResponse } from 'msw';
import { db } from '../db';
import { apiUrl, csrfError, mockDelay, unauthorized, validationError } from '../utils';

/**
 * PATCH /profile (parte usada pela fase 3: trocar cidade/UF pelo seletor de localização).
 * A fase 6 completa o perfil (descrição, contato, endereço, foto…).
 */
export const profileHandlers = [
  http.patch(apiUrl('/profile'), async ({ request }) => {
    await mockDelay();
    const csrf = csrfError(request);
    if (csrf) return csrf;
    const current = db.sessionUser();
    if (!current) return unauthorized();
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      city?: string;
      state?: string;
      bio?: string | null;
    };
    if ((body.city === undefined) !== (body.state === undefined)) {
      return validationError([
        { path: body.city === undefined ? 'city' : 'state', message: 'Informe cidade e UF juntas' },
      ]);
    }
    if (body.city !== undefined && body.city.trim().length < 2) {
      return validationError([{ path: 'city', message: 'Mínimo de 2 caracteres' }]);
    }
    const user = current.user;
    if (body.name !== undefined) user.name = body.name.trim();
    if (body.city !== undefined) user.city = body.city.trim();
    if (body.state !== undefined) user.state = body.state as typeof user.state;
    if (body.bio !== undefined) user.bio = body.bio;
    return HttpResponse.json({ user });
  }),
];
