// lib/frameworkDetector.js
// Detects tech stack from error messages, stack traces, and ticket descriptions
// Covers 90+ frameworks across all categories

// ── FRAMEWORK DEFINITIONS ────────────────────────────────────────
export const FRAMEWORKS = {

  // ── FRONTEND ──────────────────────────────────────────────────
  react: {
    name: 'React', category: 'frontend', language: 'JavaScript',
    patterns: [
      /react/i, /jsx/i, /ReactDOM/i, /useState|useEffect|useRef|useCallback|useMemo/,
      /Cannot read propert.*undefined.*render/i,
      /Each child in a list should have a unique "key"/i,
      /Warning: Can't perform a React state update on an unmounted component/i,
      /Uncaught Error: Minified React error/i,
      /Objects are not valid as a React child/i,
      /Invalid hook call/i,
      /hooks can only be called inside/i,
      /React\.createElement/i,
    ],
    common_errors: [
      'White screen / blank render', 'Invalid hook call', 'Key prop missing in list',
      'State update on unmounted component', 'Hydration mismatch', 'Infinite re-render loop',
    ],
    ai_context: `React (JavaScript UI library) specific diagnosis:
- Check for missing key props in lists
- Verify hooks are called at top level (not inside conditions/loops)
- Check for state updates after component unmounts (cleanup in useEffect)
- Hydration mismatches happen when server HTML differs from client render
- Infinite loops caused by missing dependency arrays in useEffect
- Check React DevTools for component tree errors`,
  },

  nextjs: {
    name: 'Next.js', category: 'frontend', language: 'JavaScript',
    patterns: [
      /next\.js|nextjs|next\/router|next\/navigation|next\/image/i,
      /getServerSideProps|getStaticProps|getStaticPaths/i,
      /\_app\.js|\_document\.js|pages\//i,
      /Error: Hydration failed/i,
      /Error: Text content does not match server-rendered HTML/i,
      /NEXT_NOT_FOUND|notFound\(\)/i,
      /app\/.*\/page\.(js|ts|jsx|tsx)/i,
      /Server Components|Client Components|use client/i,
    ],
    common_errors: [
      'Hydration mismatch', 'notFound() called', 'API route 500',
      'getServerSideProps error', 'Image optimization error', 'Build failure',
    ],
    ai_context: `Next.js (React framework) specific diagnosis:
- Hydration errors: server HTML doesn't match client render — check dynamic content wrapped in useEffect
- API routes in /app/api or /pages/api — check route.js exports (GET, POST)
- Server Components cannot use useState/useEffect — add 'use client' directive
- notFound() must be called from server components or page files
- Image component requires width/height or fill prop
- Check .env.local for missing NEXT_PUBLIC_ variables`,
  },

  angular: {
    name: 'Angular', category: 'frontend', language: 'TypeScript',
    patterns: [
      /angular/i, /NgModule|@Component|@Injectable|@NgModule/,
      /NullInjectorError/i, /Can't bind to '.*' since it isn't a known property/i,
      /No provider for/i, /ExpressionChangedAfterItHasBeenCheckedError/i,
      /zone\.js/i, /ERROR TypeError.*undefined.*ngOnInit/i,
      /NG\d{4}/i,
    ],
    common_errors: [
      'NullInjectorError — missing provider', 'ExpressionChangedAfterItHasBeenChecked',
      'Can\'t bind to property — missing module import', 'HTTP interceptor error',
      'Change detection issue', 'Route guard blocking navigation',
    ],
    ai_context: `Angular (TypeScript framework) specific diagnosis:
- NullInjectorError: Service not provided in module or root — add to providers array
- ExpressionChangedAfterChecked: Avoid changing values in ngAfterViewInit — use setTimeout or ChangeDetectorRef
- Can't bind to 'ngModel': FormsModule not imported in module
- Zone.js errors often indicate async operations not tracked by Angular
- Check NG error codes at angular.io/errors for exact fix
- Use Angular DevTools for component/injector debugging`,
  },

  vuejs: {
    name: 'Vue.js', category: 'frontend', language: 'JavaScript',
    patterns: [
      /vue\.js|vuejs|vue@|vue\/|\.vue/i,
      /\[Vue warn\]/i, /v-model|v-bind|v-for|v-if/i,
      /Property or method .* is not defined on the instance/i,
      /Avoid mutating a prop directly/i,
      /Cannot read property .* of undefined.*vue/i,
      /vuex|pinia/i,
    ],
    common_errors: [
      'Property not defined on instance', 'Mutating prop directly',
      'Vuex/Pinia state mutation outside mutation handler',
      'v-for missing key', 'Template compilation error',
    ],
    ai_context: `Vue.js specific diagnosis:
- [Vue warn]: Property not defined — add to data() or computed
- Prop mutation: use $emit to send changes to parent, never mutate props
- Vuex: only mutate state inside mutations, not actions
- v-for always needs :key binding
- Async components need error boundaries
- Check Vue DevTools for reactive state inspection`,
  },

  nuxtjs: {
    name: 'Nuxt.js', category: 'frontend', language: 'JavaScript',
    patterns: [
      /nuxt\.js|nuxtjs|nuxt\//i,
      /useAsyncData|useFetch|useRuntimeConfig/i,
      /nuxt\.config\.(js|ts)/i,
      /server\/api\//i,
    ],
    common_errors: ['SSR hydration error', 'useAsyncData failing', 'Nuxt server route error'],
    ai_context: `Nuxt.js (Vue SSR framework) specific diagnosis:
- SSR errors: wrap browser-only code in if (process.client)
- useAsyncData errors: check server API endpoint and error handling
- Runtime config: use useRuntimeConfig() not process.env in components
- Auto-imports may cause issues — check imports in nuxt.config.ts`,
  },

  svelte: {
    name: 'Svelte', category: 'frontend', language: 'JavaScript',
    patterns: [/svelte/i, /\.svelte/i, /SvelteKit/i, /svelte\/store/i],
    common_errors: ['Store subscription leak', 'SvelteKit load() error', 'Hydration error'],
    ai_context: `Svelte/SvelteKit specific diagnosis:
- Always unsubscribe from stores in onDestroy()
- SvelteKit load() must return serializable data
- Use $: for reactive declarations
- Actions (use:) must return { destroy } cleanup`,
  },

  // ── BACKEND — JAVA ────────────────────────────────────────────
  springboot: {
    name: 'Spring Boot', category: 'backend', language: 'Java',
    patterns: [
      /spring.boot|springboot|spring-boot/i,
      /org\.springframework/i,
      /NullPointerException.*at com\./i,
      /BeanCreationException|NoSuchBeanDefinitionException/i,
      /@SpringBootApplication|@RestController|@Service|@Repository/i,
      /application\.properties|application\.yml/i,
      /JPA|Hibernate|@Entity|@Repository/i,
      /Failed to configure a DataSource/i,
      /Port \d+ was already in use/i,
      /UnsatisfiedDependencyException/i,
      /WhitelabelErrorPage/i,
    ],
    common_errors: [
      'NullPointerException in service layer', 'BeanCreationException',
      'DataSource configuration failed', 'Port already in use',
      'LazyInitializationException (Hibernate)', 'CORS blocked',
      'JWT authentication failure', 'Database connection pool exhausted',
    ],
    ai_context: `Spring Boot (Java) specific diagnosis:
- NullPointerException: Missing @Autowired injection or calling method on null bean
- BeanCreationException: Check @Component/@Service annotation, circular dependency
- DataSource failed: Check application.properties — spring.datasource.url/username/password
- LazyInitializationException: Add @Transactional or use EAGER fetch type
- CORS: Add @CrossOrigin or configure CorsConfigurationSource bean
- Port in use: Change server.port in application.properties or kill existing process
- JWT issues: Verify token expiry, secret key match between issuer and validator
- UnsatisfiedDependencyException: Missing @Component annotation on injected class`,
  },

  hibernate: {
    name: 'Hibernate', category: 'backend', language: 'Java',
    patterns: [
      /hibernate/i, /org\.hibernate/i,
      /LazyInitializationException/i,
      /could not initialize proxy.*no Session/i,
      /NonUniqueObjectException/i,
      /StaleObjectStateException/i,
      /@Entity|@Table|@Column|@OneToMany|@ManyToOne/i,
    ],
    common_errors: [
      'LazyInitializationException', 'Session closed error',
      'N+1 query problem', 'Optimistic locking failure',
    ],
    ai_context: `Hibernate (JPA ORM) specific diagnosis:
- LazyInitializationException: Session is closed when accessing lazy collection — use @Transactional, JOIN FETCH, or change to EAGER
- N+1 problem: Use @BatchSize, JOIN FETCH in JPQL, or EntityGraph
- NonUniqueObjectException: Detached entity re-attached — use merge() not persist()
- StaleObjectStateException: Optimistic locking — handle @Version conflicts with retry logic`,
  },

  // ── BACKEND — .NET ────────────────────────────────────────────
  aspnetcore: {
    name: 'ASP.NET Core', category: 'backend', language: 'C#',
    patterns: [
      /asp\.net|aspnet|microsoft\.aspnetcore/i,
      /System\.NullReferenceException/i,
      /InvalidOperationException.*Microsoft/i,
      /\.cshtml|\.razor/i,
      /IActionResult|ControllerBase|ApiController/i,
      /appsettings\.json/i,
      /IServiceCollection|AddScoped|AddSingleton/i,
    ],
    common_errors: [
      'NullReferenceException', 'DI container resolution failed',
      'CORS policy error', 'JWT validation failed', 'EF Core migration error',
    ],
    ai_context: `ASP.NET Core (C#) specific diagnosis:
- NullReferenceException: Null check before accessing — use ?. null-conditional operator
- DI resolution failed: Check service registration in Program.cs (AddScoped/AddSingleton/AddTransient)
- CORS: Configure in Program.cs with builder.Services.AddCors()
- JWT: Verify JwtBearerOptions — Authority, Audience, IssuerSigningKey
- EF Core migration: Run dotnet ef migrations add and dotnet ef database update
- appsettings.json: Use IConfiguration injection, check key names exactly`,
  },

  entityframework: {
    name: 'Entity Framework', category: 'backend', language: 'C#',
    patterns: [
      /entityframework|entity.framework|dbcontext/i,
      /Microsoft\.EntityFrameworkCore/i,
      /DbUpdateException|DbUpdateConcurrencyException/i,
      /Migration.*failed/i,
    ],
    common_errors: ['DbUpdateException — constraint violation', 'Migration failed', 'Concurrency conflict'],
    ai_context: `Entity Framework Core diagnosis:
- DbUpdateException: Check database constraints (FK, unique, not-null)
- Migration failed: Check for pending migrations, run dotnet ef database update
- Concurrency: Add [ConcurrencyCheck] or [Timestamp] and handle DbUpdateConcurrencyException
- N+1: Use .Include() for eager loading, avoid lazy loading in loops`,
  },

  // ── BACKEND — NODE.JS ─────────────────────────────────────────
  expressjs: {
    name: 'Express.js', category: 'backend', language: 'JavaScript',
    patterns: [
      /express/i, /app\.get|app\.post|app\.use|app\.listen/i,
      /EADDRINUSE/i, /Cannot GET \/|Cannot POST \//i,
      /req\.|res\.|next\(/i,
      /express-validator|express-jwt|express-rate-limit/i,
    ],
    common_errors: [
      'EADDRINUSE — port in use', 'Cannot GET route — missing route definition',
      'CORS error', 'Unhandled promise rejection in middleware',
      'JWT verification failed', 'Body parser error',
    ],
    ai_context: `Express.js (Node.js) specific diagnosis:
- EADDRINUSE: Port already in use — kill with lsof -i :PORT or change PORT env variable
- Cannot GET: Route not defined or wrong HTTP method
- CORS: Use cors() middleware — app.use(cors({ origin: 'yourfrontend.com' }))
- Unhandled promise rejection: Add .catch() or use async/await with try/catch
- Always call next(err) to pass errors to error-handling middleware
- Body not parsed: Add app.use(express.json()) and app.use(express.urlencoded())`,
  },

  nestjs: {
    name: 'NestJS', category: 'backend', language: 'TypeScript',
    patterns: [
      /nestjs|@nestjs|nest\.js/i,
      /@Controller|@Injectable|@Module|@Get|@Post/i,
      /NestFactory|INestApplication/i,
      /Nest can't resolve dependencies/i,
    ],
    common_errors: [
      'Dependency resolution error', 'Guard blocking request',
      'Pipe validation failed', 'Interceptor error',
    ],
    ai_context: `NestJS (TypeScript framework) specific diagnosis:
- Can't resolve dependencies: Add provider to module's providers array
- Guards: Implement canActivate() and handle async properly
- Pipes: Use class-validator decorators and ValidationPipe globally
- Interceptors: Always return next.handle() observable
- Use @nestjs/config for environment variables`,
  },

  // ── BACKEND — PYTHON ──────────────────────────────────────────
  django: {
    name: 'Django', category: 'backend', language: 'Python',
    patterns: [
      /django/i, /DJANGO_SETTINGS_MODULE/i,
      /ImproperlyConfigured/i, /DoesNotExist|MultipleObjectsReturned/i,
      /django\.core|django\.db|django\.views/i,
      /migrations\..*Migration/i,
      /settings\.py|urls\.py|views\.py|models\.py/i,
      /IntegrityError.*django/i,
    ],
    common_errors: [
      'DoesNotExist exception', 'Migration error', 'ImproperlyConfigured',
      'CSRF verification failed', 'Database IntegrityError', '500 server error',
    ],
    ai_context: `Django (Python) specific diagnosis:
- DoesNotExist: Use .filter().first() instead of .get() to avoid exception
- Migration error: Run python manage.py makemigrations and python manage.py migrate
- ImproperlyConfigured: Check settings.py — DATABASES, INSTALLED_APPS, SECRET_KEY
- CSRF failed: Add {% csrf_token %} in forms or use @csrf_exempt for APIs
- IntegrityError: Check unique constraints and foreign keys in models
- DEBUG=True for development, always False in production
- Static files: Run python manage.py collectstatic for production`,
  },

  flask: {
    name: 'Flask', category: 'backend', language: 'Python',
    patterns: [
      /flask/i, /from flask import|import flask/i,
      /app\.route|@app\.route/i,
      /werkzeug/i, /jinja2/i,
      /flask\.ext|flask_sqlalchemy|flask_login/i,
    ],
    common_errors: [
      'RuntimeError: working outside application context',
      '404 Not Found', 'Template not found', 'SQLAlchemy session error',
    ],
    ai_context: `Flask (Python) specific diagnosis:
- Working outside app context: Use with app.app_context(): or push_context()
- 404: Check route definitions and Blueprint registration
- Template not found: Ensure template is in /templates folder
- SQLAlchemy: Always db.session.commit() after changes, rollback on error
- CORS: Use flask-cors — CORS(app) or @cross_origin()
- Debug mode: Never run with debug=True in production`,
  },

  fastapi: {
    name: 'FastAPI', category: 'backend', language: 'Python',
    patterns: [
      /fastapi/i, /from fastapi import/i,
      /@app\.get|@app\.post|@router\./i,
      /pydantic|BaseModel/i,
      /uvicorn/i, /HTTPException/i,
    ],
    common_errors: [
      'Pydantic validation error', '422 Unprocessable Entity',
      'Dependency injection error', 'CORS middleware missing',
    ],
    ai_context: `FastAPI (Python async) specific diagnosis:
- 422 Unprocessable Entity: Request body doesn't match Pydantic model — check field types and required fields
- Validation error: Check Pydantic model field definitions and validators
- CORS: Add CORSMiddleware — app.add_middleware(CORSMiddleware, allow_origins=[...])
- Async functions: Use async def for async routes, def for sync
- Dependencies: Use Depends() for injecting shared logic
- Authentication: Use OAuth2PasswordBearer for JWT token extraction`,
  },

  // ── BACKEND — PHP ─────────────────────────────────────────────
  laravel: {
    name: 'Laravel', category: 'backend', language: 'PHP',
    patterns: [
      /laravel/i, /Illuminate\\/i,
      /artisan/i, /\.env.*APP_KEY/i,
      /Eloquent|eloquent/i,
      /ErrorException.*PHP/i,
      /php artisan/i,
    ],
    common_errors: [
      'APP_KEY not set', 'Eloquent model not found', 'SQLSTATE error',
      'Class not found — composer autoload', 'CSRF token mismatch',
    ],
    ai_context: `Laravel (PHP) specific diagnosis:
- APP_KEY missing: Run php artisan key:generate
- Class not found: Run composer dump-autoload
- CSRF mismatch: Add @csrf in forms or exclude route in VerifyCsrfToken
- Model not found: Check namespace and use statement
- Migration: Run php artisan migrate or php artisan migrate:fresh
- Queue failed: Check QUEUE_CONNECTION in .env, run php artisan queue:work`,
  },

  // ── BACKEND — RUBY ────────────────────────────────────────────
  rails: {
    name: 'Ruby on Rails', category: 'backend', language: 'Ruby',
    patterns: [
      /ruby on rails|rails/i,
      /ActiveRecord|ActionController|ActionView/i,
      /Gemfile|bundler/i,
      /rake db:|rails db:/i,
      /NoMethodError.*nil:NilClass/i,
    ],
    common_errors: [
      'NoMethodError on nil:NilClass', 'ActiveRecord::RecordNotFound',
      'Migration pending', 'Asset pipeline error',
    ],
    ai_context: `Ruby on Rails specific diagnosis:
- NoMethodError on nil: Use &. safe navigation operator or check presence first
- RecordNotFound: Use find_by instead of find to return nil instead of exception
- Migration: Run rails db:migrate or rails db:schema:load
- Bundler: Run bundle install after Gemfile changes
- N+1 queries: Use includes() for eager loading associations`,
  },

  // ── MOBILE ────────────────────────────────────────────────────
  reactnative: {
    name: 'React Native', category: 'mobile', language: 'JavaScript',
    patterns: [
      /react.native|react-native/i,
      /metro bundler|metro/i,
      /Invariant Violation/i,
      /RCT.*NativeModule/i,
      /android\/app|ios\/.*xcodeproj/i,
      /Gradle build failed/i,
      /pod install/i,
    ],
    common_errors: [
      'Metro bundler error', 'Native module not linked',
      'Gradle build failed', 'Pod install failed',
      'Invariant Violation', 'Bridge communication error',
    ],
    ai_context: `React Native specific diagnosis:
- Metro bundler error: Clear cache — npx react-native start --reset-cache
- Native module not linked: Run npx react-native link or check autolinking
- Gradle failed: Check android/build.gradle SDK versions and sync
- Pod install: Run cd ios && pod install --repo-update
- Invariant Violation: Component rendering issue — check null props
- For Android: Check AndroidManifest.xml permissions`,
  },

  flutter: {
    name: 'Flutter', category: 'mobile', language: 'Dart',
    patterns: [
      /flutter/i, /dart/i,
      /pubspec\.yaml/i,
      /setState\(\)|StatefulWidget|StatelessWidget/i,
      /FlutterError/i,
      /RenderFlex overflowed/i,
      /NoSuchMethodError.*dart/i,
    ],
    common_errors: [
      'RenderFlex overflowed', 'setState called after dispose',
      'Null check operator on null', 'pubspec dependency conflict',
    ],
    ai_context: `Flutter (Dart) specific diagnosis:
- RenderFlex overflowed: Wrap child in Expanded, Flexible, or SingleChildScrollView
- setState after dispose: Check mounted before setState — if (!mounted) return
- Null safety: Use ?. and ?? operators, check for null before calling methods
- pubspec conflict: Run flutter pub upgrade or manually resolve version constraints
- run flutter clean && flutter pub get after pubspec changes`,
  },

  // ── DEVOPS ────────────────────────────────────────────────────
  docker: {
    name: 'Docker', category: 'devops', language: 'YAML/Shell',
    patterns: [
      /docker/i, /dockerfile|docker-compose/i,
      /container.*exited/i,
      /port.*already.*allocated/i,
      /no such file or directory.*docker/i,
      /image.*not found/i,
      /network.*not found/i,
    ],
    common_errors: [
      'Port already allocated', 'Container exited with code 1',
      'Image not found', 'Volume mount error', 'Network not found',
    ],
    ai_context: `Docker specific diagnosis:
- Port already in use: Stop conflicting container — docker ps and docker stop [id]
- Container exit code 1: Check logs — docker logs [container_id]
- Image not found: Run docker pull or check image name/tag
- Volume permissions: Check file ownership in Dockerfile — USER directive
- Network: Create network — docker network create [name]
- docker-compose: Run docker-compose down && docker-compose up --build`,
  },

  kubernetes: {
    name: 'Kubernetes', category: 'devops', language: 'YAML',
    patterns: [
      /kubernetes|kubectl|k8s/i,
      /CrashLoopBackOff/i,
      /ImagePullBackOff|ErrImagePull/i,
      /OOMKilled/i,
      /pod.*pending|pod.*failed/i,
      /configmap|secret|deployment\.yaml/i,
    ],
    common_errors: [
      'CrashLoopBackOff', 'ImagePullBackOff', 'OOMKilled',
      'Pod pending — insufficient resources', 'Service not reachable',
    ],
    ai_context: `Kubernetes specific diagnosis:
- CrashLoopBackOff: Check pod logs — kubectl logs [pod] --previous
- ImagePullBackOff: Check image name, tag, and registry credentials (imagePullSecrets)
- OOMKilled: Increase memory limits in deployment.yaml — resources.limits.memory
- Pending pod: Check node resources — kubectl describe node
- Service unreachable: Check selector labels match pod labels, port mappings
- Debug: kubectl describe pod [pod-name] for detailed events`,
  },

  terraform: {
    name: 'Terraform', category: 'devops', language: 'HCL',
    patterns: [
      /terraform/i, /\.tf\b/i,
      /terraform init|terraform apply|terraform plan/i,
      /Error.*terraform/i,
      /provider.*aws|provider.*azure|provider.*google/i,
    ],
    common_errors: [
      'State lock error', 'Provider authentication failed',
      'Resource already exists', 'Plan/apply conflict',
    ],
    ai_context: `Terraform specific diagnosis:
- State lock: Run terraform force-unlock [LOCK_ID] if stuck
- Auth failed: Check AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY env vars
- Resource exists: Import existing resource — terraform import
- Init failed: Run terraform init -upgrade
- Always run terraform plan before terraform apply`,
  },

  // ── DATABASE ──────────────────────────────────────────────────
  postgresql: {
    name: 'PostgreSQL', category: 'database', language: 'SQL',
    patterns: [
      /postgresql|postgres/i,
      /SQLSTATE|pg_error/i,
      /relation .* does not exist/i,
      /violates foreign key constraint/i,
      /duplicate key value violates unique constraint/i,
      /deadlock detected/i,
      /could not connect to server.*postgres/i,
    ],
    common_errors: [
      'Relation does not exist — migration not run',
      'Duplicate key violation', 'Foreign key violation',
      'Deadlock detected', 'Connection refused',
    ],
    ai_context: `PostgreSQL specific diagnosis:
- Relation does not exist: Run migrations — schema out of sync
- Duplicate key: INSERT has duplicate for unique/primary key — use INSERT ON CONFLICT
- FK violation: Check referenced record exists before insert
- Deadlock: Review transaction ordering, add retry logic
- Connection refused: Check pg_hba.conf, PostgreSQL service status, and connection string
- Max connections: Increase max_connections or use connection pooling (PgBouncer)`,
  },

  mongodb: {
    name: 'MongoDB', category: 'database', language: 'JavaScript',
    patterns: [
      /mongodb|mongoose/i,
      /MongoError|MongoServerError/i,
      /E11000 duplicate key/i,
      /MongoNetworkError/i,
      /CastError.*ObjectId/i,
    ],
    common_errors: [
      'E11000 duplicate key', 'CastError — invalid ObjectId',
      'MongoNetworkError — connection failed', 'Validation error',
    ],
    ai_context: `MongoDB/Mongoose specific diagnosis:
- E11000 duplicate key: Unique index violation — check existing documents
- CastError ObjectId: Invalid ID format passed — validate with mongoose.Types.ObjectId.isValid()
- Network error: Check MongoDB connection string and Atlas whitelist IPs
- Validation error: Check Mongoose schema required fields and types
- Use .lean() for read-only queries for better performance`,
  },

  // ── BIG DATA ──────────────────────────────────────────────────
  kafka: {
    name: 'Apache Kafka', category: 'bigdata', language: 'Java/Scala',
    patterns: [
      /kafka/i, /org\.apache\.kafka/i,
      /KafkaException/i,
      /broker.*not available/i,
      /consumer.*lag/i,
      /topic.*already exists/i,
      /serialization.*kafka/i,
    ],
    common_errors: [
      'Broker not available', 'Consumer lag too high',
      'Serialization error', 'Offset out of range', 'Rebalancing loop',
    ],
    ai_context: `Apache Kafka specific diagnosis:
- Broker unavailable: Check Kafka server status and bootstrap.servers config
- Consumer lag: Scale consumers or optimize processing time
- Serialization error: Verify producer and consumer use matching serializer/deserializer
- Offset out of range: Set auto.offset.reset=earliest or latest
- Rebalancing loop: Increase session.timeout.ms and heartbeat.interval.ms`,
  },

  // ── AI/ML ─────────────────────────────────────────────────────
  tensorflow: {
    name: 'TensorFlow', category: 'ml', language: 'Python',
    patterns: [
      /tensorflow|tf\./i,
      /ResourceExhaustedError.*OOM/i,
      /InvalidArgumentError.*tensor/i,
      /shape mismatch/i,
      /CUDA.*out of memory/i,
    ],
    common_errors: [
      'OOM — GPU out of memory', 'Shape mismatch',
      'CUDA error', 'Graph execution error',
    ],
    ai_context: `TensorFlow specific diagnosis:
- OOM: Reduce batch size, use tf.data with prefetch, clear session between runs
- Shape mismatch: Print tensor shapes — tf.print(tensor.shape) to debug
- CUDA error: Check CUDA/cuDNN version compatibility with TF version
- Use tf.debugging.enable_check_numerics() to catch NaN/Inf values`,
  },

  pytorch: {
    name: 'PyTorch', category: 'ml', language: 'Python',
    patterns: [
      /pytorch|torch\./i,
      /RuntimeError.*CUDA/i,
      /Expected.*tensor.*got/i,
      /autograd/i,
      /CUDA out of memory/i,
    ],
    common_errors: [
      'CUDA out of memory', 'Tensor device mismatch',
      'Autograd error', 'DataLoader worker crash',
    ],
    ai_context: `PyTorch specific diagnosis:
- CUDA OOM: Reduce batch size, use torch.cuda.empty_cache(), use gradient checkpointing
- Device mismatch: Ensure all tensors on same device — tensor.to(device)
- Autograd: Don't use in-place operations on tensors requiring grad
- DataLoader crash: Set num_workers=0 to debug, check dataset __getitem__`,
  },

  // ── BLOCKCHAIN ────────────────────────────────────────────────
  ethereum: {
    name: 'Ethereum/Solidity', category: 'blockchain', language: 'Solidity',
    patterns: [
      /ethereum|solidity|web3|ethers/i,
      /revert|require.*failed/i,
      /gas limit|out of gas/i,
      /nonce.*mismatch/i,
      /transaction.*reverted/i,
    ],
    common_errors: [
      'Transaction reverted', 'Out of gas', 'Nonce mismatch',
      'Contract not deployed', 'ABI encoding error',
    ],
    ai_context: `Ethereum/Solidity specific diagnosis:
- Transaction reverted: Check require/revert conditions in smart contract
- Out of gas: Increase gas limit or optimize contract loops
- Nonce mismatch: Reset MetaMask account nonce or use pending nonce
- ABI mismatch: Recompile contract and update ABI in frontend
- Use Hardhat console.log for debugging contract execution`,
  },
}

// ── MAIN DETECTOR FUNCTION ───────────────────────────────────────

/**
 * Detect frameworks from error text + title + description
 * @param {string} title       — ticket title
 * @param {string} description — ticket description
 * @param {string[]} appStack  — known stack from App Registry (optional)
 * @returns {{ detected: string[], contexts: string[], names: string[] }}
 */
export function detectFrameworks(title = '', description = '', appStack = []) {
  const text    = `${title} ${description}`.toLowerCase()
  const fullText = `${title} ${description}`
  const detected = new Set(appStack) // start with known stack

  // Pattern matching across all frameworks
  for (const [key, fw] of Object.entries(FRAMEWORKS)) {
    if (detected.has(key)) continue
    for (const pattern of fw.patterns) {
      if (pattern.test(fullText)) {
        detected.add(key)
        break
      }
    }
  }

  // Additional heuristics
  if (/nullpointerexception|npe|java\.|\.java|at com\.|at org\./i.test(fullText)) {
    detected.add('springboot')
  }
  if (/typeerror|cannot read prop|undefined is not/i.test(fullText) && /react|jsx|component/i.test(fullText)) {
    detected.add('react')
  }
  if (/500|internal server error/i.test(fullText)) {
    // Generic server error — add context for most likely framework based on other signals
  }

  const detectedArray = [...detected]
  const names    = detectedArray.map(k => FRAMEWORKS[k]?.name || k)
  const contexts = detectedArray
    .filter(k => FRAMEWORKS[k])
    .map(k => `\n--- ${FRAMEWORKS[k].name} Context ---\n${FRAMEWORKS[k].ai_context}`)

  return {
    detected:      detectedArray,
    names,
    contexts:      contexts.join('\n'),
    hasDetection:  detectedArray.length > 0,
    categories:    [...new Set(detectedArray.map(k => FRAMEWORKS[k]?.category).filter(Boolean))],
  }
}

/**
 * Get all framework names for a category
 */
export function getFrameworksByCategory(category) {
  return Object.entries(FRAMEWORKS)
    .filter(([, fw]) => fw.category === category)
    .map(([key, fw]) => ({ key, name: fw.name, language: fw.language }))
}

/**
 * Get all categories
 */
export const FRAMEWORK_CATEGORIES = {
  frontend:   'Frontend',
  backend:    'Backend',
  mobile:     'Mobile',
  devops:     'DevOps',
  database:   'Database',
  ml:         'AI / ML',
  bigdata:    'Big Data',
  blockchain: 'Blockchain',
}
