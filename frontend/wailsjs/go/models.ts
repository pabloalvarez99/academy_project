export namespace content {
	
	export class ModuleVersion {
	    version: string;
	    exercise_count?: number;
	    article_count?: number;
	
	    static createFrom(source: any = {}) {
	        return new ModuleVersion(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.version = source["version"];
	        this.exercise_count = source["exercise_count"];
	        this.article_count = source["article_count"];
	    }
	}
	export class ContentVersion {
	    version: string;
	    build: number;
	    modules: Record<string, ModuleVersion>;
	
	    static createFrom(source: any = {}) {
	        return new ContentVersion(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.version = source["version"];
	        this.build = source["build"];
	        this.modules = this.convertValues(source["modules"], ModuleVersion, true);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ExerciseMeta {
	    version: string;
	    contentVersion: number;
	    module: string;
	    language: string;
	    category: string;
	
	    static createFrom(source: any = {}) {
	        return new ExerciseMeta(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.version = source["version"];
	        this.contentVersion = source["contentVersion"];
	        this.module = source["module"];
	        this.language = source["language"];
	        this.category = source["category"];
	    }
	}
	export class TestCase {
	    input: string;
	    expectedOutput: string;
	    timeLimitMs: number;
	    memoryLimitKb: number;
	
	    static createFrom(source: any = {}) {
	        return new TestCase(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.input = source["input"];
	        this.expectedOutput = source["expectedOutput"];
	        this.timeLimitMs = source["timeLimitMs"];
	        this.memoryLimitKb = source["memoryLimitKb"];
	    }
	}
	export class Exercise {
	    id: string;
	    title: string;
	    difficulty: number;
	    tags: string[];
	    description: string;
	    starterCode: string;
	    testCases: TestCase[];
	    hints: string[];
	    solution: string;
	    metadata: ExerciseMeta;
	
	    static createFrom(source: any = {}) {
	        return new Exercise(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.difficulty = source["difficulty"];
	        this.tags = source["tags"];
	        this.description = source["description"];
	        this.starterCode = source["starterCode"];
	        this.testCases = this.convertValues(source["testCases"], TestCase);
	        this.hints = source["hints"];
	        this.solution = source["solution"];
	        this.metadata = this.convertValues(source["metadata"], ExerciseMeta);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class ExerciseSummary {
	    id: string;
	    title: string;
	    difficulty: number;
	    category: string;
	
	    static createFrom(source: any = {}) {
	        return new ExerciseSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.difficulty = source["difficulty"];
	        this.category = source["category"];
	    }
	}
	

}

export namespace grammarmodel {
	
	export class ValidationError {
	    position: number;
	    length: number;
	    message: string;
	    rule: string;
	    original: string;
	    suggest: string;
	
	    static createFrom(source: any = {}) {
	        return new ValidationError(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.position = source["position"];
	        this.length = source["length"];
	        this.message = source["message"];
	        this.rule = source["rule"];
	        this.original = source["original"];
	        this.suggest = source["suggest"];
	    }
	}
	export class ValidationResult {
	    input: string;
	    errors: ValidationError[];
	    score: number;
	    isValid: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ValidationResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.input = source["input"];
	        this.errors = this.convertValues(source["errors"], ValidationError);
	        this.score = source["score"];
	        this.isValid = source["isValid"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace knowledge {
	
	export class Article {
	    id: string;
	    title: string;
	    category: string;
	    tags: string[];
	    body: string;
	
	    static createFrom(source: any = {}) {
	        return new Article(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.category = source["category"];
	        this.tags = source["tags"];
	        this.body = source["body"];
	    }
	}
	export class Category {
	    id: string;
	    title: string;
	    count: number;
	
	    static createFrom(source: any = {}) {
	        return new Category(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.count = source["count"];
	    }
	}

}

export namespace programming {
	
	export class SubmitRequest {
	    exerciseId: string;
	    language: string;
	    code: string;
	
	    static createFrom(source: any = {}) {
	        return new SubmitRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.exerciseId = source["exerciseId"];
	        this.language = source["language"];
	        this.code = source["code"];
	    }
	}
	export class TestResult {
	    testIndex: number;
	    passed: boolean;
	    expectedOutput: string;
	    actualOutput: string;
	    timeMs: number;
	    timedOut: boolean;
	
	    static createFrom(source: any = {}) {
	        return new TestResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.testIndex = source["testIndex"];
	        this.passed = source["passed"];
	        this.expectedOutput = source["expectedOutput"];
	        this.actualOutput = source["actualOutput"];
	        this.timeMs = source["timeMs"];
	        this.timedOut = source["timedOut"];
	    }
	}
	export class SubmitResult {
	    passed: boolean;
	    score: number;
	    testResults: TestResult[];
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new SubmitResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.passed = source["passed"];
	        this.score = source["score"];
	        this.testResults = this.convertValues(source["testResults"], TestResult);
	        this.error = source["error"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace progress {
	
	export class Achievement {
	    id: string;
	    title: string;
	    description: string;
	    icon: string;
	    earnedAt?: number;
	    earned: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Achievement(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.description = source["description"];
	        this.icon = source["icon"];
	        this.earnedAt = source["earnedAt"];
	        this.earned = source["earned"];
	    }
	}
	export class ModuleProgress {
	    module: string;
	    category: string;
	    total: number;
	    completed: number;
	    passed: number;
	    percent: number;
	
	    static createFrom(source: any = {}) {
	        return new ModuleProgress(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.module = source["module"];
	        this.category = source["category"];
	        this.total = source["total"];
	        this.completed = source["completed"];
	        this.passed = source["passed"];
	        this.percent = source["percent"];
	    }
	}
	export class UserStats {
	    totalAttempts: number;
	    totalPassed: number;
	    passRate: number;
	    moduleProgress: ModuleProgress[];
	    achievements: Achievement[];
	
	    static createFrom(source: any = {}) {
	        return new UserStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.totalAttempts = source["totalAttempts"];
	        this.totalPassed = source["totalPassed"];
	        this.passRate = source["passRate"];
	        this.moduleProgress = this.convertValues(source["moduleProgress"], ModuleProgress);
	        this.achievements = this.convertValues(source["achievements"], Achievement);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace search {
	
	export class SearchResult {
	    id: string;
	    title: string;
	    module: string;
	    category: string;
	    excerpt: string;
	    score: number;
	
	    static createFrom(source: any = {}) {
	        return new SearchResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.module = source["module"];
	        this.category = source["category"];
	        this.excerpt = source["excerpt"];
	        this.score = source["score"];
	    }
	}

}

export namespace sqllab {
	
	export class QueryResult {
	    columns: string[];
	    rows: any[][];
	    rowsAffected: number;
	    timeMs: number;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new QueryResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.columns = source["columns"];
	        this.rows = source["rows"];
	        this.rowsAffected = source["rowsAffected"];
	        this.timeMs = source["timeMs"];
	        this.error = source["error"];
	    }
	}
	export class EvaluationResult {
	    passed: boolean;
	    userResult: QueryResult;
	    score: number;
	    message: string;
	    queryPlan?: string;
	
	    static createFrom(source: any = {}) {
	        return new EvaluationResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.passed = source["passed"];
	        this.userResult = this.convertValues(source["userResult"], QueryResult);
	        this.score = source["score"];
	        this.message = source["message"];
	        this.queryPlan = source["queryPlan"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace user {
	
	export class CreateUserRequest {
	    username: string;
	    displayName: string;
	    pin: string;
	    avatar: string;
	
	    static createFrom(source: any = {}) {
	        return new CreateUserRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.username = source["username"];
	        this.displayName = source["displayName"];
	        this.pin = source["pin"];
	        this.avatar = source["avatar"];
	    }
	}
	export class User {
	    id: string;
	    username: string;
	    displayName: string;
	    avatar: string;
	    createdAt: number;
	    lastActive: number;
	    settings: string;
	
	    static createFrom(source: any = {}) {
	        return new User(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.username = source["username"];
	        this.displayName = source["displayName"];
	        this.avatar = source["avatar"];
	        this.createdAt = source["createdAt"];
	        this.lastActive = source["lastActive"];
	        this.settings = source["settings"];
	    }
	}

}

