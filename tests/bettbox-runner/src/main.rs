use rquickjs::{CatchResultExt, Context, Runtime};
use std::{env, fs, time::{Duration, Instant}};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();
    let source = fs::read_to_string(&args[1])?;
    let input = fs::read_to_string(&args[2])?;
    let options = args.get(4).map(|value| value.as_str()).unwrap_or("null");
    let runtime = Runtime::new()?;
    runtime.set_memory_limit(128 * 1024 * 1024);
    runtime.set_max_stack_size(512 * 1024);
    let deadline = Instant::now() + Duration::from_secs(10);
    runtime.set_interrupt_handler(Some(Box::new(move || Instant::now() >= deadline)));
    let context = Context::full(&runtime)?;
    let program = format!(
        "(function(__config,__custom){{{source}\n;if(__custom&&typeof ruleOptionsEnable!=='undefined')Object.assign(ruleOptionsEnable,__custom);return JSON.stringify(main(__config));}})({input},{options})"
    );
    let result = context.with(|ctx| {
        ctx.eval::<String, _>(program).catch(&ctx).map_err(|error| format!("{error:?}"))
    })?;
    fs::write(&args[3], result)?;
    println!("Bettbox rquickjs 0.12.2: script accepted");
    Ok(())
}
