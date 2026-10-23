use rquickjs::{CatchResultExt, Context, Runtime};
use std::{env, fs, time::{Duration, Instant}};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();
    let source = fs::read_to_string(&args[1])?;
    let input = fs::read_to_string(&args[2])?;
    let runtime = Runtime::new()?;
    runtime.set_memory_limit(args[4].parse()?);
    runtime.set_max_stack_size(args[5].parse()?);
    let deadline = Instant::now() + Duration::from_secs(args[6].parse()?);
    runtime.set_interrupt_handler(Some(Box::new(move || Instant::now() >= deadline)));
    let context = Context::full(&runtime)?;
    let program = format!(
        "(function(__config){{{source}\nreturn JSON.stringify(main(__config));}})({input})"
    );
    let result = context.with(|ctx| {
        ctx.eval::<String, _>(program).catch(&ctx).map_err(|error| format!("{error:?}"))
    })?;
    fs::write(&args[3], result)?;
    Ok(())
}
