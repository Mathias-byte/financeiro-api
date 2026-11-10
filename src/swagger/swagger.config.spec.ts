import { swaggerHabilitado } from './swagger.config';

describe('swaggerHabilitado', () => {
  it('liga fora de produção e desliga em produção', () => {
    expect(swaggerHabilitado({ NODE_ENV: 'development' } as any)).toBe(true);
    expect(swaggerHabilitado({} as any)).toBe(true);
    expect(swaggerHabilitado({ NODE_ENV: 'production' } as any)).toBe(false);
  });
  it('SWAGGER_ENABLED vale mais que NODE_ENV', () => {
    expect(swaggerHabilitado({ NODE_ENV: 'production', SWAGGER_ENABLED: 'true' } as any)).toBe(true);
    expect(swaggerHabilitado({ NODE_ENV: 'production', SWAGGER_ENABLED: '1' } as any)).toBe(true);
    expect(swaggerHabilitado({ NODE_ENV: 'development', SWAGGER_ENABLED: 'false' } as any)).toBe(false);
    expect(swaggerHabilitado({ NODE_ENV: 'development', SWAGGER_ENABLED: '0' } as any)).toBe(false);
    expect(swaggerHabilitado({ NODE_ENV: 'production', SWAGGER_ENABLED: '' } as any)).toBe(false);
  });
});
